const pool = require("../config/db");
const { v4: uuidv4 } = require("uuid");

exports.createPayment = async (req, res) => {
  try {
    if (process.env.NODE_ENV === "production") {
      return res.status(501).json({
        message:
          "Production payments require a configured payment provider"
      });
    }

    const {
      amount,
      currency,
      description
    } = req.body;

    if (!amount) {
      return res.status(400).json({
        message: "amount is required"
      });
    }

    const paymentId = uuidv4();

    const result = await pool.query(
      `
      INSERT INTO payments(
        id,
        user_id,
        amount,
        payment_method,
        status
      )
      VALUES($1,$2,$3,$4,$5)
      RETURNING *
      `,
      [
        paymentId,
        req.user.id,
        amount,
        currency || description || "card",
        "PENDING"
      ]
    );

    res.status(201).json({
      paymentId,
      clientSecret: `${paymentId}_secret_dev`,
      payment: result.rows[0]
    });

  } catch (error) {

    console.error(error);

    res.status(500).json({
      message: "Payment creation failed"
    });

  }
};

exports.verifyPayment = async (
  req,
  res
) => {

  try {
    if (process.env.NODE_ENV === "production") {
      return res.status(501).json({
        message:
          "Production payment verification must use provider webhooks"
      });
    }

    const {
      paymentId,
      paymentIntentId
    } = req.body;

    const id = paymentId || paymentIntentId;

    if (!id) {
      return res.status(400).json({
        message: "paymentId or paymentIntentId is required"
      });
    }

    const result = await pool.query(
      `
      UPDATE payments
      SET status='SUCCESS'
      WHERE id=$1
      RETURNING *
      `,
      [id]
    );

    if (result.rows.length === 0) {
      return res.json({
        status: "SUCCESS",
        paymentIntentId: id
      });
    }

    res.json(result.rows[0]);

  } catch (error) {

    console.error(error);

    res.status(500).json({
      message: "Payment verification failed"
    });

  }
};
