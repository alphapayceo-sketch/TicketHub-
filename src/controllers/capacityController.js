const db = require("../config/db");
const { v4: uuidv4 } = require("uuid");

/**
 * Capacity Management Controller
 * Monitors and manages event capacity
 */

exports.getEventCapacity = async (req, res) => {
  try {
    const { eventId } = req.params;

    const eventResult = await db.query(
      `SELECT 
        id,
        title,
        capacity,
        status
       FROM events 
       WHERE id = $1`,
      [eventId]
    );

    if (eventResult.rows.length === 0) {
      return res.status(404).json({ error: "Event not found" });
    }

    const event = eventResult.rows[0];

    const ticketResult = await db.query(
      `SELECT COUNT(*) as sold FROM tickets WHERE event_id = $1 AND status IN ('VALID', 'USED')`,
      [eventId]
    );

    const sold = parseInt(ticketResult.rows[0].sold);
    const capacity = event.capacity;
    const remaining = capacity - sold;
    const percentageFilled = ((sold / capacity) * 100).toFixed(2);

    res.json({
      eventId,
      eventTitle: event.title,
      capacity,
      sold,
      remaining,
      percentageFilled: parseFloat(percentageFilled),
      status: event.status,
      capacityStatus: getCapacityStatus(remaining, capacity)
    });
  } catch (error) {
    console.error("Error fetching event capacity:", error);
    res.status(500).json({ error: "Failed to fetch event capacity" });
  }
};

function getCapacityStatus(remaining, capacity) {
  const percentage = (remaining / capacity) * 100;
  if (percentage === 0) return 'SOLD_OUT';
  if (percentage < 10) return 'NEARLY_FULL';
  if (percentage < 30) return 'FILLING_UP';
  if (percentage < 70) return 'AVAILABLE';
  return 'PLENTY_AVAILABLE';
}

exports.getMultipleEventCapacity = async (req, res) => {
  try {
    const { eventIds } = req.body;

    if (!Array.isArray(eventIds) || eventIds.length === 0) {
      return res.status(400).json({ error: "Event IDs array required" });
    }

    const placeholders = eventIds.map((_, i) => `$${i+1}`).join(',');

    const result = await db.query(
      `SELECT 
        e.id,
        e.title,
        e.capacity,
        COUNT(t.id) as sold,
        (e.capacity - COUNT(t.id)) as remaining,
        ROUND((COUNT(t.id)::float / e.capacity * 100)::numeric, 2) as percentage_filled
       FROM events e
       LEFT JOIN tickets t ON e.id = t.event_id AND t.status IN ('VALID', 'USED')
       WHERE e.id IN (${placeholders})
       GROUP BY e.id, e.title, e.capacity`,
      eventIds
    );

    res.json(result.rows.map(row => ({
      ...row,
      capacityStatus: getCapacityStatus(row.remaining, row.capacity)
    })));
  } catch (error) {
    console.error("Error fetching multiple event capacity:", error);
    res.status(500).json({ error: "Failed to fetch event capacity data" });
  }
};

exports.logCapacitySnapshot = async (req, res) => {
  try {
    const { eventId } = req.params;

    const eventResult = await db.query(
      "SELECT capacity FROM events WHERE id = $1",
      [eventId]
    );

    if (eventResult.rows.length === 0) {
      return res.status(404).json({ error: "Event not found" });
    }

    const ticketResult = await db.query(
      `SELECT COUNT(*) as sold FROM tickets WHERE event_id = $1 AND status IN ('VALID', 'USED')`,
      [eventId]
    );

    const capacity = eventResult.rows[0].capacity;
    const sold = parseInt(ticketResult.rows[0].sold);
    const remaining = capacity - sold;

    const logId = uuidv4();
    await db.query(
      `INSERT INTO event_capacity_logs (id, event_id, capacity, sold, remaining)
       VALUES ($1, $2, $3, $4, $5)`,
      [logId, eventId, capacity, sold, remaining]
    );

    res.status(201).json({
      message: "Capacity snapshot logged",
      logId,
      capacity,
      sold,
      remaining
    });
  } catch (error) {
    console.error("Error logging capacity snapshot:", error);
    res.status(500).json({ error: "Failed to log capacity" });
  }
};

exports.getCapacityHistory = async (req, res) => {
  try {
    const { eventId } = req.params;
    const { limit = 100 } = req.query;

    const result = await db.query(
      `SELECT 
        id,
        event_id,
        capacity,
        sold,
        remaining,
        recorded_at
       FROM event_capacity_logs
       WHERE event_id = $1
       ORDER BY recorded_at DESC
       LIMIT $2`,
      [eventId, limit]
    );

    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching capacity history:", error);
    res.status(500).json({ error: "Failed to fetch capacity history" });
  }
};

exports.getCapacityAlerts = async (req, res) => {
  try {
    const { threshold = 10 } = req.query;

    const result = await db.query(
      `SELECT 
        e.id,
        e.title,
        e.date,
        e.time,
        e.capacity,
        COUNT(t.id) as sold,
        (e.capacity - COUNT(t.id)) as remaining,
        ROUND((COUNT(t.id)::float / e.capacity * 100)::numeric, 2) as percentage_filled
       FROM events e
       LEFT JOIN tickets t ON e.id = t.event_id AND t.status IN ('VALID', 'USED')
       WHERE e.status NOT IN ('COMPLETED', 'CANCELLED')
       GROUP BY e.id, e.title, e.date, e.time, e.capacity
       HAVING (e.capacity - COUNT(t.id)) <= ($1)
       ORDER BY remaining ASC`,
      [threshold]
    );

    res.json({
      alertThreshold: `${threshold} tickets remaining`,
      eventCount: result.rows.length,
      alerts: result.rows.map(row => ({
        ...row,
        urgency: row.remaining === 0 ? 'CRITICAL' : row.remaining < Math.ceil(row.capacity * 0.05) ? 'HIGH' : 'MEDIUM'
      }))
    });
  } catch (error) {
    console.error("Error fetching capacity alerts:", error);
    res.status(500).json({ error: "Failed to fetch capacity alerts" });
  }
};

exports.updateEventCapacity = async (req, res) => {
  try {
    const { eventId } = req.params;
    const { newCapacity } = req.body;
    const userId = req.user.id;

    if (!newCapacity || newCapacity < 1) {
      return res.status(400).json({ error: "Valid capacity required" });
    }

    // Check authorization
    const eventResult = await db.query(
      "SELECT organizer_id FROM events WHERE id = $1",
      [eventId]
    );

    if (eventResult.rows.length === 0) {
      return res.status(404).json({ error: "Event not found" });
    }

    if (eventResult.rows[0].organizer_id !== userId && req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: "Not authorized to modify this event" });
    }

    // Check if new capacity is valid (not less than already sold)
    const soldResult = await db.query(
      `SELECT COUNT(*) as sold FROM tickets WHERE event_id = $1 AND status IN ('VALID', 'USED')`,
      [eventId]
    );

    const sold = parseInt(soldResult.rows[0].sold);
    if (newCapacity < sold) {
      return res.status(400).json({ 
        error: `New capacity cannot be less than already sold tickets (${sold})` 
      });
    }

    await db.query(
      "UPDATE events SET capacity = $1 WHERE id = $2",
      [newCapacity, eventId]
    );

    res.json({
      message: "Event capacity updated",
      eventId,
      newCapacity
    });
  } catch (error) {
    console.error("Error updating event capacity:", error);
    res.status(500).json({ error: "Failed to update capacity" });
  }
};
