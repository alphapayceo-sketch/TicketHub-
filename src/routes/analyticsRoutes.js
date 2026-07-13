const router = require("express").Router();

const authMiddleware =
  require("../middleware/authMiddleware");

const {
  getDashboardStats
} = require("../controllers/analyticsController");

router.get(
  "/dashboard",
  authMiddleware,
  getDashboardStats
);

module.exports = router;