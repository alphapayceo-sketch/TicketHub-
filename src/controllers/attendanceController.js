const db = require("../config/db");
const { v4: uuidv4 } = require("uuid");

/**
 * Attendance Logging Controller
 * Handles QR code scanning and attendance tracking
 */

exports.recordAttendance = async (req, res) => {
  try {
    const { ticketId, scanType, location } = req.body;
    const scannedByUserId = req.user.id;

    if (!ticketId) {
      return res.status(400).json({ error: "Ticket ID required" });
    }

    // Get ticket and event info
    const ticketResult = await db.query(
      `SELECT t.id, t.event_id, t.status, e.organizer_id, e.title
       FROM tickets t
       JOIN events e ON t.event_id = e.id
       WHERE t.id = $1`,
      [ticketId]
    );

    if (ticketResult.rows.length === 0) {
      return res.status(404).json({ error: "Ticket not found" });
    }

    const ticket = ticketResult.rows[0];

    // Verify user is organizer of the event
    if (ticket.organizer_id !== scannedByUserId && req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: "Not authorized to scan this event's tickets" });
    }

    // Check if ticket is valid
    if (ticket.status !== 'VALID') {
      return res.status(400).json({ error: `Cannot scan ticket with status: ${ticket.status}` });
    }

    // Record the scan
    const logId = uuidv4();
    await db.query(
      `INSERT INTO attendance_logs (id, ticket_id, scanned_by_user_id, event_id, scan_type, location)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [logId, ticketId, scannedByUserId, ticket.event_id, scanType || 'ENTRY', location || null]
    );

    // Update ticket status based on scan type
    if (scanType === 'ENTRY') {
      await db.query(
        "UPDATE tickets SET status = $1 WHERE id = $2",
        ['USED', ticketId]
      );
    } else if (scanType === 'EXIT') {
      await db.query(
        "UPDATE tickets SET status = $1 WHERE id = $2",
        ['CHECKED_OUT', ticketId]
      );
    }

    res.status(201).json({
      message: `Attendance recorded - ${scanType || 'ENTRY'}`,
      logId,
      ticketId,
      eventTitle: ticket.title,
      scanType: scanType || 'ENTRY'
    });
  } catch (error) {
    console.error("Error recording attendance:", error);
    res.status(500).json({ error: "Failed to record attendance" });
  }
};

exports.getAttendanceLog = async (req, res) => {
  try {
    const { ticketId } = req.params;

    const result = await db.query(
      `SELECT 
        id,
        ticket_id,
        scanned_by_user_id,
        u.fullname as scanned_by,
        event_id,
        scan_type,
        scanned_at,
        location
       FROM attendance_logs al
       JOIN users u ON al.scanned_by_user_id = u.id
       WHERE al.ticket_id = $1
       ORDER BY scanned_at DESC`,
      [ticketId]
    );

    res.json({
      ticketId,
      totalScans: result.rows.length,
      logs: result.rows
    });
  } catch (error) {
    console.error("Error fetching attendance log:", error);
    res.status(500).json({ error: "Failed to fetch attendance log" });
  }
};

exports.getEventAttendance = async (req, res) => {
  try {
    const { eventId } = req.params;
    const { page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;
    const userId = req.user.id;

    // Verify user is organizer or admin
    const eventResult = await db.query(
      "SELECT organizer_id FROM events WHERE id = $1",
      [eventId]
    );

    if (eventResult.rows.length === 0) {
      return res.status(404).json({ error: "Event not found" });
    }

    if (eventResult.rows[0].organizer_id !== userId && req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: "Not authorized to view this event's attendance" });
    }

    const result = await db.query(
      `SELECT 
        al.id,
        al.ticket_id,
        t.ticket_number,
        u.fullname as attendee_name,
        u.email,
        al.scan_type,
        al.scanned_at,
        al.location,
        scanner.fullname as scanned_by
       FROM attendance_logs al
       JOIN tickets t ON al.ticket_id = t.id
       JOIN users u ON t.user_id = u.id
       JOIN users scanner ON al.scanned_by_user_id = scanner.id
       WHERE al.event_id = $1
       ORDER BY al.scanned_at DESC
       LIMIT $2 OFFSET $3`,
      [eventId, limit, offset]
    );

    // Get summary stats
    const statsResult = await db.query(
      `SELECT 
        COUNT(DISTINCT t.user_id) as unique_attendees,
        COUNT(CASE WHEN al.scan_type = 'ENTRY' THEN 1 END) as entries,
        COUNT(CASE WHEN al.scan_type = 'EXIT' THEN 1 END) as exits,
        COUNT(CASE WHEN al.scan_type = 'ENTRY' THEN 1 END) - COUNT(CASE WHEN al.scan_type = 'EXIT' THEN 1 END) as currently_present
       FROM attendance_logs al
       JOIN tickets t ON al.ticket_id = t.id
       WHERE al.event_id = $1`,
      [eventId]
    );

    const stats = statsResult.rows[0];

    // Get count
    const countResult = await db.query(
      "SELECT COUNT(*) as total FROM attendance_logs WHERE event_id = $1",
      [eventId]
    );

    res.json({
      eventId,
      summary: {
        uniqueAttendees: parseInt(stats.unique_attendees),
        totalEntries: parseInt(stats.entries),
        totalExits: parseInt(stats.exits),
        currentlyPresent: parseInt(stats.currently_present)
      },
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: parseInt(countResult.rows[0].total)
      },
      logs: result.rows
    });
  } catch (error) {
    console.error("Error fetching event attendance:", error);
    res.status(500).json({ error: "Failed to fetch event attendance" });
  }
};

exports.getAttendanceStats = async (req, res) => {
  try {
    const { eventId } = req.params;
    const userId = req.user.id;

    // Verify authorization
    const eventResult = await db.query(
      "SELECT organizer_id, capacity FROM events WHERE id = $1",
      [eventId]
    );

    if (eventResult.rows.length === 0) {
      return res.status(404).json({ error: "Event not found" });
    }

    if (eventResult.rows[0].organizer_id !== userId && req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: "Not authorized" });
    }

    const capacity = eventResult.rows[0].capacity;

    const result = await db.query(
      `SELECT 
        COUNT(DISTINCT t.user_id) as attendees_count,
        COUNT(CASE WHEN al.scan_type = 'ENTRY' THEN 1 END) as entry_count,
        COUNT(CASE WHEN al.scan_type = 'EXIT' THEN 1 END) as exit_count,
        MIN(al.scanned_at) as first_entry,
        MAX(al.scanned_at) as last_entry,
        COUNT(DISTINCT al.location) as locations_used
       FROM attendance_logs al
       JOIN tickets t ON al.ticket_id = t.id
       WHERE al.event_id = $1`,
      [eventId]
    );

    const stats = result.rows[0];

    res.json({
      eventId,
      capacity,
      attendance: {
        attendees: parseInt(stats.attendees_count),
        attendanceRate: ((parseInt(stats.attendees_count) / capacity) * 100).toFixed(2) + '%',
        entries: parseInt(stats.entry_count),
        exits: parseInt(stats.exit_count),
        firstEntry: stats.first_entry,
        lastEntry: stats.last_entry,
        locationsUsed: parseInt(stats.locations_used)
      }
    });
  } catch (error) {
    console.error("Error fetching attendance stats:", error);
    res.status(500).json({ error: "Failed to fetch attendance stats" });
  }
};

exports.bulkScanTickets = async (req, res) => {
  try {
    const { ticketIds, scanType, location } = req.body;
    const scannedByUserId = req.user.id;

    if (!Array.isArray(ticketIds) || ticketIds.length === 0) {
      return res.status(400).json({ error: "Ticket IDs array required" });
    }

    const scannedIds = [];
    const failedIds = [];

    for (const ticketId of ticketIds) {
      try {
        const ticketResult = await db.query(
          `SELECT t.id, t.event_id, t.status, e.organizer_id
           FROM tickets t
           JOIN events e ON t.event_id = e.id
           WHERE t.id = $1`,
          [ticketId]
        );

        if (ticketResult.rows.length === 0) {
          failedIds.push({ ticketId, reason: 'Not found' });
          continue;
        }

        const ticket = ticketResult.rows[0];

        if (ticket.organizer_id !== scannedByUserId && req.user.role !== 'ADMIN') {
          failedIds.push({ ticketId, reason: 'Not authorized' });
          continue;
        }

        if (ticket.status !== 'VALID') {
          failedIds.push({ ticketId, reason: `Invalid status: ${ticket.status}` });
          continue;
        }

        const logId = uuidv4();
        await db.query(
          `INSERT INTO attendance_logs (id, ticket_id, scanned_by_user_id, event_id, scan_type, location)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [logId, ticketId, scannedByUserId, ticket.event_id, scanType || 'ENTRY', location || null]
        );

        if (scanType === 'ENTRY') {
          await db.query("UPDATE tickets SET status = $1 WHERE id = $2", ['USED', ticketId]);
        } else if (scanType === 'EXIT') {
          await db.query("UPDATE tickets SET status = $1 WHERE id = $2", ['CHECKED_OUT', ticketId]);
        }

        scannedIds.push(ticketId);
      } catch (error) {
        failedIds.push({ ticketId, reason: error.message });
      }
    }

    res.json({
      message: "Bulk scan completed",
      scanned: scannedIds.length,
      failed: failedIds.length,
      results: {
        successful: scannedIds,
        failed: failedIds
      }
    });
  } catch (error) {
    console.error("Error in bulk scan:", error);
    res.status(500).json({ error: "Failed to perform bulk scan" });
  }
};

exports.getLocationStats = async (req, res) => {
  try {
    const { eventId } = req.params;

    const result = await db.query(
      `SELECT 
        location,
        COUNT(*) as scans,
        COUNT(DISTINCT ticket_id) as unique_tickets,
        COUNT(CASE WHEN scan_type = 'ENTRY' THEN 1 END) as entries,
        COUNT(CASE WHEN scan_type = 'EXIT' THEN 1 END) as exits
       FROM attendance_logs
       WHERE event_id = $1 AND location IS NOT NULL
       GROUP BY location
       ORDER BY scans DESC`,
      [eventId]
    );

    res.json({
      eventId,
      locations: result.rows
    });
  } catch (error) {
    console.error("Error fetching location stats:", error);
    res.status(500).json({ error: "Failed to fetch location stats" });
  }
};
