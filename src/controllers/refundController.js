const pool = require("../config/db");
const { v4: uuidv4 } = require("uuid");

exports.requestRefund = async (
  req,
  res
) => {

  try {

    const {
      ticketId,
      ticketNumber,
      reason
    } = req.body;

    if (!ticketId && !ticketNumber) {
      return res.status(400).json({
        message: "ticketId or ticketNumber is required"
      });
    }

    if (!reason) {
      return res.status(400).json({
        message: "Refund reason is required"
      });
    }

    let resolvedTicketId = ticketId;

    if (!resolvedTicketId) {
      const ticket = await pool.query(
        `
        SELECT id
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

      resolvedTicketId = ticket.rows[0].id;
    }

    const result = await pool.query(
      `
      INSERT INTO refunds(
        id,
        ticket_id,
        user_id,
        reason,
        status
      )
      VALUES($1,$2,$3,$4,$5)
      RETURNING *
      `,
      [
        uuidv4(),
        resolvedTicketId,
        req.user.id,
        reason,
        "PENDING"
      ]
    );

    res.status(201).json({
      ...result.rows[0],
      refund_id: result.rows[0].id
    });

  } catch (error) {

    res.status(500).json({
      message: "Refund request failed"
    });

  }

};

exports.getUserRefunds = async (
  req,
  res
) => {

  try {

    const result = await pool.query(
      `
      SELECT
        refunds.*,
        tickets.ticket_number
      FROM refunds
      LEFT JOIN tickets
        ON tickets.id = refunds.ticket_id
      WHERE refunds.user_id=$1
      ORDER BY refunds.created_at DESC
      `,
      [req.user.id]
    );

    res.json(result.rows);

  } catch (error) {

    res.status(500).json({
      message: "Failed to fetch refunds"
    });

  }

};

exports.approveRefund = async (
  req,
  res
) => {

  const { refundId } = req.body;

  const result = await pool.query(
    `
    UPDATE refunds
    SET status='APPROVED'
    WHERE id=$1
    RETURNING *
    `,
    [refundId]
  );

  res.json(result.rows[0]);
};
