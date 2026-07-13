const router = require("express").Router();

const authMiddleware =
  require("../middleware/authMiddleware");

const roleMiddleware =
  require("../middleware/roleMiddleware");

const {
  applyOrganizer,
  approveOrganizer,
  getMyApplication,
  rejectOrganizer
} = require("../controllers/organizerController");

router.post(
  "/apply",
  authMiddleware,
  applyOrganizer
);

router.post(
  "/approve",
  authMiddleware,
  roleMiddleware("ADMIN"),
  approveOrganizer
);

router.get(
  "/my-application",
  authMiddleware,
  getMyApplication
);

router.post(
  "/reject",
  authMiddleware,
  roleMiddleware("ADMIN"),
  rejectOrganizer
);

module.exports = router;
