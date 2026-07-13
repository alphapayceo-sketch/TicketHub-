const router = require("express").Router();

const authMiddleware =
  require("../middleware/authMiddleware");

const {
  createPayment,
  verifyPayment
} = require("../controllers/paymentController");

router.post(
  "/verify",
  authMiddleware,
  verifyPayment
);

router.post(
  "/confirm",
  authMiddleware,
  verifyPayment
);

router.post(
  "/create",
  authMiddleware,
  createPayment
);

router.post(
  "/create-intent",
  authMiddleware,
  createPayment
);

module.exports = router;
