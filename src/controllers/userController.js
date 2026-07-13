const pool = require("../config/db");

exports.getMe = async (
  req,
  res
) => {

  try {

    const result = await pool.query(
      `
      SELECT
        id,
        firebase_uid,
        fullname,
        email,
        role,
        created_at
      FROM users
      WHERE id=$1
      `,
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "User not found"
      });
    }

    res.json(result.rows[0]);

  } catch (error) {

    res.status(500).json({
      message: "Failed to fetch user"
    });

  }

};

exports.updateProfile = async (
  req,
  res
) => {

  try {

    const {
      fullname
    } = req.body;

    const result = await pool.query(
      `
      UPDATE users
      SET fullname=$1
      WHERE id=$2
      RETURNING *
      `,
      [
        fullname,
        req.user.id
      ]
    );

    res.json(result.rows[0]);

  } catch (error) {

    res.status(500).json({
      message: "Profile update failed"
    });

  }

};

exports.saveFcmToken = async (
  req,
  res
) => {

  try {

    const { fcmToken } = req.body;

    await pool.query(
      `
      UPDATE users
      SET fcm_token=$1
      WHERE id=$2
      `,
      [
        fcmToken,
        req.user.id
      ]
    );

    res.json({
      success: true
    });

  } catch (error) {

    res.status(500).json({
      message: "Failed to save token"
    });

  }

};