const pool = require("../config/db");
const { v4: uuidv4 } = require("uuid");

exports.getMyApplication = async (
  req,
  res
) => {

  try {

    const result = await pool.query(
      `
      SELECT *
      FROM organizer_applications
      WHERE user_id=$1
      ORDER BY created_at DESC
      LIMIT 1
      `,
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "No application found"
      });
    }

    res.json(result.rows[0]);

  } catch (error) {

    res.status(500).json({
      message: "Failed to fetch application"
    });

  }

};

exports.applyOrganizer = async (
  req,
  res
) => {

  try {

    const {
      business_name,
      phone,
      description
    } = req.body;

    const result = await pool.query(
      `
      INSERT INTO organizer_applications(
        id,
        user_id,
        business_name,
        phone,
        description
      )
      VALUES($1,$2,$3,$4,$5)
      RETURNING *
      `,
      [
        uuidv4(),
        req.user.id,
        business_name,
        phone,
        description
      ]
    );

    res.status(201).json(result.rows[0]);

  } catch (error) {

    res.status(500).json({
      message: "Application failed"
    });

  }

};

exports.approveOrganizer = async (
  req,
  res
) => {

  const { applicationId } = req.body;

  const application = await pool.query(
    `
    SELECT *
    FROM organizer_applications
    WHERE id = $1
    `,
    [applicationId]
  );

  if (application.rows.length === 0) {

    return res.status(404).json({
      message: "Application not found"
    });

  }

  await pool.query(
    `
    UPDATE organizer_applications
    SET status='APPROVED'
    WHERE id=$1
    `,
    [applicationId]
  );

  await pool.query(
    `
    UPDATE users
    SET role='ORGANIZER'
    WHERE id=$1
    `,
    [application.rows[0].user_id]
  );

  res.json({
    success: true,
    message: "Organizer approved"
  });

};

exports.rejectOrganizer = async (
  req,
  res
) => {

  const { applicationId } = req.body;

  await pool.query(
    `
    UPDATE organizer_applications
    SET status='REJECTED'
    WHERE id=$1
    `,
    [applicationId]
  );

  res.json({
    success: true,
    message: "Organizer application rejected"
  });

};