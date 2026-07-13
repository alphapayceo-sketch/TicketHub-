const router = require("express").Router();

const authMiddleware =
  require("../middleware/authMiddleware");

const roleMiddleware =
  require("../middleware/roleMiddleware");

const {
  requestRefund,
  getUserRefunds,
  approveRefund
} = require("../controllers/refundController");

router.get(
  "/",
  authMiddleware,
  getUserRefunds
);

router.post(
  "/",
  authMiddleware,
  requestRefund
);

router.post(
  "/request",
  authMiddleware,
  requestRefund
);

router.post(
  "/approve",
  authMiddleware,
  roleMiddleware("ADMIN"),
  approveRefund
);

module.exports = router;
