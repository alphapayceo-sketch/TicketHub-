const admin = require("../config/firebase");
const pool = require("../config/db");
const jwt = require("jsonwebtoken");
const { v4: uuidv4 } = require("uuid");

exports.firebaseLogin = async (req, res) => {
  try {
    const { firebaseToken } = req.body;

    if (!firebaseToken || firebaseToken === "<firebase_id_token>") {
      return res.status(400).json({
        success: false,
        message: "firebaseToken is required"
      });
    }

    const decoded =
      await admin.auth().verifyIdToken(firebaseToken);

    let user = await pool.query(
      "SELECT * FROM users WHERE firebase_uid=$1",
      [decoded.uid]
    );

    if (user.rows.length === 0) {

      user = await pool.query(
        `
        INSERT INTO users(
          id,
          firebase_uid,
          fullname,
          email,
          role
        )
        VALUES($1,$2,$3,$4,$5)
        RETURNING *
        `,
        [
          uuidv4(),
          decoded.uid,
          decoded.name || "",
          decoded.email,
          "CUSTOMER"
        ]
      );
    }

    const token = jwt.sign(
      {
        id: user.rows[0].id,
        role: user.rows[0].role
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    return res.json({
      success: true,
      token,
      user: user.rows[0]
    });

  } catch (error) {
    console.error("Firebase login failed:", error.code || error.message);

    return res.status(401).json({
      success: false,
      message: "Authentication failed",
      error:
        process.env.NODE_ENV === "production"
          ? undefined
          : error.code || error.message
    });
  }
};

exports.devLogin = async (req, res) => {
  if (process.env.NODE_ENV === "production") {
    return res.status(404).json({
      message: "Not found"
    });
  }

  try {
    const {
      email = "dev@example.com",
      fullname = "Dev User",
      role = "CUSTOMER"
    } = req.body;

    const normalizedRole = String(role).toUpperCase();

    if (!["CUSTOMER", "ORGANIZER", "ADMIN"].includes(normalizedRole)) {
      return res.status(400).json({
        message: "role must be CUSTOMER, ORGANIZER, or ADMIN"
      });
    }

    let user = await pool.query(
      "SELECT * FROM users WHERE email=$1",
      [email]
    );

    if (user.rows.length === 0) {
      user = await pool.query(
        `
        INSERT INTO users(
          id,
          firebase_uid,
          fullname,
          email,
          role
        )
        VALUES($1,$2,$3,$4,$5)
        RETURNING *
        `,
        [
          uuidv4(),
          `dev:${email}`,
          fullname,
          email,
          normalizedRole
        ]
      );
    } else {
      user = await pool.query(
        `
        UPDATE users
        SET role=$1,
            fullname=COALESCE($2, fullname)
        WHERE email=$3
        RETURNING *
        `,
        [
          normalizedRole,
          fullname,
          email
        ]
      );
    }

    const token = jwt.sign(
      {
        id: user.rows[0].id,
        role: user.rows[0].role,
        fullname: user.rows[0].fullname
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    return res.json({
      success: true,
      token,
      user: user.rows[0]
    });

  } catch (error) {
    console.error("Dev login failed:", error);

    return res.status(500).json({
      message: "Dev login failed"
    });
  }
};
