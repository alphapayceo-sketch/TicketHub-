const pool = require("../config/db");

exports.getDashboardStats = async (
  req,
  res
) => {

  try {

    const totalEvents = await pool.query(
      "SELECT COUNT(*) FROM events"
    );

    const totalTickets = await pool.query(
      "SELECT COUNT(*) FROM tickets"
    );

    const activeTickets = await pool.query(
      `
      SELECT COUNT(*)
      FROM tickets
      WHERE status='ACTIVE'
      `
    );

    const usedTickets = await pool.query(
      `
      SELECT COUNT(*)
      FROM tickets
      WHERE status='USED'
      `
    );

    const totalRefunds = await pool.query(
      "SELECT COUNT(*) FROM refunds"
    );

    res.json({
      totalEvents:
        totalEvents.rows[0].count,

      totalTickets:
        totalTickets.rows[0].count,

      activeTickets:
        activeTickets.rows[0].count,

      usedTickets:
        usedTickets.rows[0].count,

      totalRefunds:
        totalRefunds.rows[0].count
    });

  } catch (error) {

    console.error(error);

    res.status(500).json({
      message: "Failed to load dashboard"
    });

  }

};