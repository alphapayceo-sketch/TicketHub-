const pool = require("../config/db");
const { v4: uuidv4 } = require("uuid");

exports.getEvents = async (req, res) => {
  try {
    const result = await pool.query(
      `
      SELECT
        events.*,
        COUNT(tickets.id) AS tickets_sold
      FROM events
      LEFT JOIN tickets
        ON tickets.event_id = events.id
      GROUP BY events.id
      ORDER BY events.date ASC
      `
    );

    res.json(result.rows);
  } catch (err) {
    console.error(err);

    res.status(500).json({
      message: "Failed to fetch events"
    });
  }
};

exports.getEventById = async (req, res) => {
  try {
    const result = await pool.query(
      `
      SELECT
        events.*,
        COUNT(tickets.id) AS tickets_sold
      FROM events
      LEFT JOIN tickets
        ON tickets.event_id = events.id
      WHERE events.id=$1
      GROUP BY events.id
      `,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Event not found"
      });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);

    res.status(500).json({
      message: "Failed to fetch event"
    });
  }
};

exports.createEvent = async (req, res) => {
  try {
    const {
      title,
      description,
      location,
      date,
      time,
      ticket_price,
      capacity,
      image_url
    } = req.body;

    const result = await pool.query(
      `
      INSERT INTO events(
        id,
        organizer_id,
        title,
        description,
        location,
        date,
        time,
        ticket_price,
        capacity,
        image_url,
        status
      )
      VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
      RETURNING *
      `,
      [
        uuidv4(),
        req.user.id,
        title,
        description,
        location,
        date,
        time,
        ticket_price,
        capacity,
        image_url,
        "ACTIVE"
      ]
    );

    res.status(201).json(result.rows[0]);

  } catch (err) {
    console.error(err);

    res.status(500).json({
      message: "Failed to create event"
    });
  }
};

exports.updateEvent = async (
  req,
  res
) => {

  try {

    const { id } = req.params;

    const {
      title,
      description,
      location,
      date,
      time,
      ticket_price,
      capacity,
      image_url
    } = req.body;

    const result = await pool.query(
      `
      UPDATE events
      SET
        title=COALESCE($1, title),
        description=COALESCE($2, description),
        location=COALESCE($3, location),
        date=COALESCE($4, date),
        time=COALESCE($5, time),
        ticket_price=COALESCE($6, ticket_price),
        capacity=COALESCE($7, capacity),
        image_url=COALESCE($8, image_url)
      WHERE id=$9
      AND ($10 = 'ADMIN' OR organizer_id=$11)
      RETURNING *
      `,
      [
        title,
        description,
        location,
        date,
        time,
        ticket_price,
        capacity,
        image_url,
        id,
        req.user.role,
        req.user.id
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Event not found or access denied"
      });
    }

    res.json(result.rows[0]);

  } catch (error) {

    res.status(500).json({
      message: "Update failed"
    });

  }

};

exports.deleteEvent = async (
  req,
  res
) => {

  try {

    const { id } = req.params;

    const result = await pool.query(
      `
      DELETE FROM events
      WHERE id=$1
      AND ($2 = 'ADMIN' OR organizer_id=$3)
      RETURNING *
      `,
      [
        id,
        req.user.role,
        req.user.id
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Event not found or access denied"
      });
    }

    res.json({
      success: true,
      message: "Event deleted"
    });

  } catch (error) {

    res.status(500).json({
      message: "Delete failed"
    });

  }

};

exports.searchEvents = async (
  req,
  res
) => {

  try {

    const { q } = req.query;

    const result = await pool.query(
      `
      SELECT *
      FROM events
      WHERE
        LOWER(title) LIKE LOWER($1)
        OR LOWER(description) LIKE LOWER($1)
      ORDER BY date ASC
      `,
      [`%${q}%`]
    );

    res.json(result.rows);

  } catch (error) {

    res.status(500).json({
      message: "Search failed"
    });

  }

};

exports.getEventsByCategory =
  async (
    req,
    res
  ) => {

  try {

    const result = await pool.query(
      `
      SELECT events.*
      FROM events
      JOIN event_category_mapping
        ON event_category_mapping.event_id = events.id
      JOIN event_categories
        ON event_categories.id = event_category_mapping.category_id
      WHERE LOWER(event_categories.name)=LOWER($1)
      ORDER BY events.date ASC
      `,
      [req.params.category]
    );

    res.json(result.rows);

  } catch (error) {

    res.status(500).json({
      message: "Failed"
    });

  }

};

exports.completeEvent =
  async (
    req,
    res
  ) => {

  try {

    const { id } = req.params;

    const result = await pool.query(
      `
      UPDATE events
      SET status='COMPLETED'
      WHERE id=$1
      AND ($2 = 'ADMIN' OR organizer_id=$3)
      RETURNING *
      `,
      [
        id,
        req.user.role,
        req.user.id
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Event not found or access denied"
      });
    }

    res.json(result.rows[0]);

  } catch (error) {

    res.status(500).json({
      message:
        "Failed to complete event"
    });

  }

};

exports.cancelEvent =
  async (
    req,
    res
  ) => {

  try {

    const { id } = req.params;

    const result = await pool.query(
      `
      UPDATE events
      SET status='CANCELLED'
      WHERE id=$1
      AND ($2 = 'ADMIN' OR organizer_id=$3)
      RETURNING *
      `,
      [
        id,
        req.user.role,
        req.user.id
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Event not found or access denied"
      });
    }

    res.json(result.rows[0]);

  } catch (error) {

    res.status(500).json({
      message:
        "Cancellation failed"
    });

  }

};

exports.getFeaturedEvents =
async (req, res) => {

  try {

    const result = await pool.query(
      `
      SELECT *
      FROM events
      WHERE status = 'ACTIVE'
      ORDER BY date ASC
      LIMIT 10
      `
    );

    res.json(result.rows);

  } catch (error) {

    res.status(500).json({
      message: "Failed"
    });

  }

};
