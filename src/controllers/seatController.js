const db = require("../config/db");
const { v4: uuidv4 } = require("uuid");

/**
 * Seat Management Controller
 * Manages venue seats and seat assignments
 */

exports.createSeats = async (req, res) => {
  try {
    const { eventId, seats } = req.body;

    if (!eventId || !Array.isArray(seats) || seats.length === 0) {
      return res.status(400).json({ error: "Invalid event or seats data" });
    }

    const values = seats.map(seat => [
      uuidv4(),
      eventId,
      seat.section,
      seat.row,
      seat.seatNumber,
      'AVAILABLE'
    ]);

    const placeholders = values.map((_, i) => 
      `($${i*6+1}, $${i*6+2}, $${i*6+3}, $${i*6+4}, $${i*6+5}, $${i*6+6})`
    ).join(',');

    const flatValues = values.flat();

    await db.query(
      `INSERT INTO seats (id, event_id, section, row, seat_number, status)
       VALUES ${placeholders}`,
      flatValues
    );

    res.status(201).json({
      message: `${seats.length} seats created successfully`,
      seatsCreated: seats.length
    });
  } catch (error) {
    console.error("Error creating seats:", error);
    res.status(500).json({ error: "Failed to create seats" });
  }
};

exports.getSeatsByEvent = async (req, res) => {
  try {
    const { eventId } = req.params;

    const result = await db.query(
      `SELECT * FROM seats 
       WHERE event_id = $1
       ORDER BY section, row, seat_number`,
      [eventId]
    );

    const summary = {
      total: result.rows.length,
      available: result.rows.filter(s => s.status === 'AVAILABLE').length,
      reserved: result.rows.filter(s => s.status === 'RESERVED').length,
      sold: result.rows.filter(s => s.status === 'SOLD').length,
      seats: result.rows
    };

    res.json(summary);
  } catch (error) {
    console.error("Error fetching seats:", error);
    res.status(500).json({ error: "Failed to fetch seats" });
  }
};

exports.getSeatsBySection = async (req, res) => {
  try {
    const { eventId, section } = req.params;

    const result = await db.query(
      `SELECT * FROM seats 
       WHERE event_id = $1 AND section = $2
       ORDER BY row, seat_number`,
      [eventId, section]
    );

    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching section seats:", error);
    res.status(500).json({ error: "Failed to fetch section seats" });
  }
};

exports.updateSeatStatus = async (req, res) => {
  try {
    const { seatId } = req.params;
    const { status } = req.body;

    const validStatuses = ['AVAILABLE', 'RESERVED', 'SOLD', 'BLOCKED'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: "Invalid seat status" });
    }

    await db.query(
      "UPDATE seats SET status = $1 WHERE id = $2",
      [status, seatId]
    );

    res.json({ message: "Seat status updated" });
  } catch (error) {
    console.error("Error updating seat status:", error);
    res.status(500).json({ error: "Failed to update seat status" });
  }
};

exports.getAvailableSeats = async (req, res) => {
  try {
    const { eventId } = req.params;

    const result = await db.query(
      `SELECT * FROM seats 
       WHERE event_id = $1 AND status = 'AVAILABLE'
       ORDER BY section, row, seat_number`,
      [eventId]
    );

    res.json({
      available: result.rows.length,
      seats: result.rows
    });
  } catch (error) {
    console.error("Error fetching available seats:", error);
    res.status(500).json({ error: "Failed to fetch available seats" });
  }
};

exports.getSeatChart = async (req, res) => {
  try {
    const { eventId } = req.params;

    const result = await db.query(
      `SELECT section, row, COUNT(*) as total,
              SUM(CASE WHEN status = 'AVAILABLE' THEN 1 ELSE 0 END) as available,
              SUM(CASE WHEN status = 'SOLD' THEN 1 ELSE 0 END) as sold,
              SUM(CASE WHEN status = 'RESERVED' THEN 1 ELSE 0 END) as reserved
       FROM seats 
       WHERE event_id = $1
       GROUP BY section, row
       ORDER BY section, row`,
      [eventId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching seat chart:", error);
    res.status(500).json({ error: "Failed to fetch seat chart" });
  }
};

exports.blockSeats = async (req, res) => {
  try {
    const { eventId } = req.params;
    const { seatIds, reason } = req.body;

    if (!Array.isArray(seatIds) || seatIds.length === 0) {
      return res.status(400).json({ error: "Invalid seat IDs" });
    }

    const placeholders = seatIds.map((_, i) => `$${i+1}`).join(',');

    await db.query(
      `UPDATE seats SET status = 'BLOCKED' 
       WHERE id IN (${placeholders}) AND event_id = $${seatIds.length + 1}`,
      [...seatIds, eventId]
    );

    res.json({
      message: `${seatIds.length} seats blocked`,
      reason: reason || 'Not specified'
    });
  } catch (error) {
    console.error("Error blocking seats:", error);
    res.status(500).json({ error: "Failed to block seats" });
  }
};
