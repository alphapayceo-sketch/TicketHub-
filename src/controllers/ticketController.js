const pool = require("../config/db");
const { v4: uuidv4 } = require("uuid");

const generateTicketNumber =
  require("../utils/generateTicketNumber");

const {
  generateQR
} = require("../services/qrservices");

const {
  sendPushNotification
} = require("../services/notificationsService");

exports.purchaseTicket = async (
  req,
  res
) => {

  let client;

  try {

    client = await pool.connect();

    const { eventId } = req.body;

    if (!eventId) {
      return res.status(400).json({
        success: false,
        message: "eventId is required"
      });
    }

    await client.query("BEGIN");

    const event = await client.query(
      `
      SELECT *
      FROM events
      WHERE id = $1
      FOR UPDATE
      `,
      [eventId]
    );

    if (event.rows.length === 0) {

      await client.query("ROLLBACK");

      return res.status(404).json({
        success: false,
        message: "Event not found"
      });

    }

    const soldTickets = await client.query(
      `
      SELECT COUNT(*)
      FROM tickets
      WHERE event_id=$1
      AND status IN ('VALID', 'USED')
      `,
      [eventId]
    );

    if (
      Number(soldTickets.rows[0].count)
      >= event.rows[0].capacity
    ) {

      await client.query("ROLLBACK");

      return res.status(400).json({
        success: false,
        message: "Event sold out"
      });

    }

    const ticketNumber =
      generateTicketNumber();

    const qrCode =
      await generateQR(ticketNumber);

    const result = await client.query(
      `
      INSERT INTO tickets(
        id,
        event_id,
        user_id,
        qr_code,
        ticket_number,
        status
      )
      VALUES($1,$2,$3,$4,$5,$6)
      RETURNING *
      `,
      [
        uuidv4(),
        eventId,
        req.user.id,
        qrCode,
        ticketNumber,
        "VALID"
      ]
    );

    await client.query("COMMIT");

    const user = await pool.query(
      `
      SELECT *
      FROM users
      WHERE id = $1
      `,
      [req.user.id]
    );

    if (
      user.rows.length > 0 &&
      user.rows[0].fcm_token
    ) {

      await sendPushNotification(
        user.rows[0].fcm_token,
        "Ticket Purchased",
        "Your ticket was created successfully."
      );

    }

    res.status(201).json(result.rows[0]);

  } catch (error) {

    console.error(error);

    res.status(500).json({
      success: false,
      message: "Ticket purchase failed"
    });

  }

};

exports.getUserTickets = async (
  req,
  res
) => {

  try {

    const result = await pool.query(
      `
      SELECT
        tickets.*,
        events.title AS event_title,
        events.date,
        events.time,
        events.location
      FROM tickets
      JOIN events
        ON events.id = tickets.event_id
      WHERE tickets.user_id=$1
      ORDER BY tickets.purchase_date DESC
      `,
      [req.user.id]
    );

    res.json(result.rows);

  } catch (error) {

    if (client) {
      await client.query("ROLLBACK");
    }

    console.error(error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch tickets"
    });

  }
  finally {
    if (client) {
      client.release();
    }
  }

};

exports.getTicketByNumber = async (
  req,
  res
) => {

  try {

    const result = await pool.query(
      `
      SELECT *
      FROM tickets
      WHERE ticket_number = $1
      `,
      [req.params.ticketNumber]
    );

    if (result.rows.length === 0) {

      return res.status(404).json({
        success: false,
        message: "Ticket not found"
      });

    }

    res.json(result.rows[0]);

  } catch (error) {

    console.error(error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch ticket"
    });

  }

};

exports.validateTicket = async (
  req,
  res
) => {

  try {

    const { ticketNumber } = req.body;

    const result = await pool.query(
      `
      SELECT *
      FROM tickets
      WHERE ticket_number = $1
      `,
      [ticketNumber]
    );

    if (result.rows.length === 0) {

      return res.status(404).json({
        success: false,
        message: "Ticket not found"
      });

    }

    const ticket = result.rows[0];

    if (ticket.status === "USED") {

      return res.status(400).json({
        success: false,
        message: "Ticket already used"
      });

    }

    if (ticket.status !== "VALID") {

      return res.status(400).json({
        success: false,
        message: "Ticket is not valid"
      });

    }

    await pool.query(
      `
      UPDATE tickets
      SET status = 'USED'
      WHERE ticket_number = $1
      `,
      [ticketNumber]
    );

    res.json({
      success: true,
      message: "Entry Allowed",
      status: "USED"
    });

  } catch (error) {

    console.error(error);

    res.status(500).json({
      success: false,
      message: "Validation failed"
    });

  }

};

exports.transferTicket = async (
  req,
  res
) => {

  try {

    const {
      ticketNumber,
      recipientEmail
    } = req.body;

    if (!ticketNumber || !recipientEmail) {
      return res.status(400).json({
        message: "ticketNumber and recipientEmail are required"
      });
    }

    const recipient = await pool.query(
      `
      SELECT id, fullname, email
      FROM users
      WHERE email=$1
      `,
      [recipientEmail]
    );

    if (recipient.rows.length === 0) {
      return res.status(404).json({
        message: "Recipient user not found"
      });
    }

    const ticket = await pool.query(
      `
      SELECT *
      FROM tickets
      WHERE ticket_number=$1
      AND user_id=$2
      `,
      [
        ticketNumber,
        req.user.id
      ]
    );

    if (ticket.rows.length === 0) {
      return res.status(404).json({
        message: "Ticket not found"
      });
    }

    if (ticket.rows[0].status !== "VALID") {
      return res.status(400).json({
        message: "Ticket cannot be transferred"
      });
    }

    const transferId = uuidv4();

    await pool.query(
      `
      INSERT INTO ticket_transfers(
        id,
        ticket_id,
        from_user_id,
        to_user_id,
        status
      )
      VALUES($1,$2,$3,$4,$5)
      `,
      [
        transferId,
        ticket.rows[0].id,
        req.user.id,
        recipient.rows[0].id,
        "COMPLETED"
      ]
    );

    await pool.query(
      `
      UPDATE tickets
      SET user_id=$1
      WHERE id=$2
      `,
      [
        recipient.rows[0].id,
        ticket.rows[0].id
      ]
    );

    res.json({
      success: true,
      transfer_id: transferId,
      new_owner_id: recipient.rows[0].id
    });

  } catch (error) {

    console.error(error);

    res.status(500).json({
      message: "Ticket transfer failed"
    });

  }

};
