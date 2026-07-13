const db = require("../config/db");
const { v4: uuidv4 } = require("uuid");
const emailService = require("../services/emailService");

/**
 * Ticket Transfer Controller
 * Handles ticket transfers/sharing between users
 */

exports.transferTicket = async (req, res) => {
  try {
    const { ticketId, toUserId } = req.body;
    const fromUserId = req.user.id;

    // Validate ticket exists and belongs to sender
    const ticketResult = await db.query(
      `SELECT t.*, e.title, e.date, e.time, e.location, tc.name as category_name, u.email
       FROM tickets t
       JOIN events e ON t.event_id = e.id
       LEFT JOIN ticket_categories tc ON t.ticket_category_id = tc.id
       LEFT JOIN users u ON t.user_id = u.id
       WHERE t.id = $1 AND t.user_id = $2`,
      [ticketId, fromUserId]
    );

    if (ticketResult.rows.length === 0) {
      return res.status(404).json({ error: "Ticket not found or not owned by you" });
    }

    const ticket = ticketResult.rows[0];

    // Check ticket status - can't transfer if already transferred or used
    if (ticket.status !== 'VALID') {
      return res.status(400).json({ error: "Ticket cannot be transferred in its current status" });
    }

    // Get recipient user info
    const recipientResult = await db.query(
      "SELECT id, email, fullname FROM users WHERE id = $1",
      [toUserId]
    );

    if (recipientResult.rows.length === 0) {
      return res.status(404).json({ error: "Recipient user not found" });
    }

    const recipient = recipientResult.rows[0];

    // Create transfer record
    const transferId = uuidv4();
    await db.query(
      `INSERT INTO ticket_transfers (id, ticket_id, from_user_id, to_user_id, status)
       VALUES ($1, $2, $3, $4, $5)`,
      [transferId, ticketId, fromUserId, toUserId, 'COMPLETED']
    );

    // Update ticket ownership
    await db.query(
      "UPDATE tickets SET user_id = $1 WHERE id = $2",
      [toUserId, ticketId]
    );

    // Send notification emails
    try {
      await emailService.sendTransferNotification(recipient.email, {
        eventTitle: ticket.title,
        fromUserName: req.user.fullname || 'A user',
        ticketNumber: ticket.ticket_number,
        category: ticket.category_name,
        seatInfo: ticket.seat_id ? `Seat available in system` : null
      });
    } catch (emailError) {
      console.error("Failed to send transfer notification:", emailError);
      // Don't fail the entire transfer if email fails
    }

    res.json({
      message: "Ticket transferred successfully",
      transferId,
      newOwner: recipient.fullname
    });
  } catch (error) {
    console.error("Error transferring ticket:", error);
    res.status(500).json({ error: "Failed to transfer ticket" });
  }
};

exports.getTransferHistory = async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await db.query(
      `SELECT 
        tt.id,
        tt.ticket_id,
        t.ticket_number,
        e.title as event_title,
        from_u.fullname as from_user,
        from_u.email as from_email,
        to_u.fullname as to_user,
        to_u.email as to_email,
        tt.transfer_date,
        tt.status
       FROM ticket_transfers tt
       JOIN tickets t ON tt.ticket_id = t.id
       JOIN events e ON t.event_id = e.id
       JOIN users from_u ON tt.from_user_id = from_u.id
       JOIN users to_u ON tt.to_user_id = to_u.id
       WHERE tt.from_user_id = $1 OR tt.to_user_id = $1
       ORDER BY tt.transfer_date DESC`,
      [userId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching transfer history:", error);
    res.status(500).json({ error: "Failed to fetch transfer history" });
  }
};

exports.getUserTransferredTickets = async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await db.query(
      `SELECT DISTINCT
        t.id,
        t.ticket_number,
        e.title,
        e.date,
        e.time,
        e.location,
        tc.name as category,
        tt.from_user_id,
        from_u.fullname as from_user,
        tt.transfer_date
       FROM tickets t
       JOIN events e ON t.event_id = e.id
       LEFT JOIN ticket_categories tc ON t.ticket_category_id = tc.id
       LEFT JOIN ticket_transfers tt ON t.id = tt.ticket_id
       LEFT JOIN users from_u ON tt.from_user_id = from_u.id
       WHERE t.user_id = $1 AND tt.id IS NOT NULL
       ORDER BY tt.transfer_date DESC`,
      [userId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching transferred tickets:", error);
    res.status(500).json({ error: "Failed to fetch transferred tickets" });
  }
};

exports.getEventTransfers = async (req, res) => {
  try {
    const { eventId } = req.params;
    const userId = req.user.id;

    // Check if user is organizer
    const eventResult = await db.query(
      "SELECT organizer_id FROM events WHERE id = $1",
      [eventId]
    );

    if (eventResult.rows.length === 0) {
      return res.status(404).json({ error: "Event not found" });
    }

    if (eventResult.rows[0].organizer_id !== userId) {
      return res.status(403).json({ error: "Not authorized to view this event's transfers" });
    }

    const result = await db.query(
      `SELECT 
        tt.id,
        t.ticket_number,
        from_u.fullname as from_user,
        to_u.fullname as to_user,
        tt.transfer_date,
        tt.status
       FROM ticket_transfers tt
       JOIN tickets t ON tt.ticket_id = t.id
       WHERE t.event_id = $1
       ORDER BY tt.transfer_date DESC`,
      [eventId]
    );

    res.json({
      eventId,
      totalTransfers: result.rows.length,
      transfers: result.rows
    });
  } catch (error) {
    console.error("Error fetching event transfers:", error);
    res.status(500).json({ error: "Failed to fetch event transfers" });
  }
};
