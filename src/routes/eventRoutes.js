const router = require("express").Router();

const authMiddleware =
  require("../middleware/authMiddleware");

const roleMiddleware =
  require("../middleware/roleMiddleware");

const {
  createEvent,
  getEventById,
  getEvents,
  updateEvent,
  deleteEvent,
  cancelEvent,
  completeEvent,
  searchEvents,
  getEventsByCategory,
  getFeaturedEvents
} = require("../controllers/eventController");

router.post(
  "/",
  authMiddleware,
  roleMiddleware("ORGANIZER", "ADMIN"),
  createEvent
);

router.get("/", getEvents);

router.get(
  "/search",
  searchEvents
);

router.get(
  "/featured",
  getFeaturedEvents
);

router.get(
  "/category/:category",
  getEventsByCategory
);

router.get(
  "/:id",
  getEventById
);

router.put(
  "/:id",
  authMiddleware,
  roleMiddleware("ORGANIZER", "ADMIN"),
  updateEvent
);

router.delete(
  "/:id",
  authMiddleware,
  roleMiddleware("ORGANIZER", "ADMIN"),
  deleteEvent
);

router.patch(
  "/:id/cancel",
  authMiddleware,
  roleMiddleware("ORGANIZER", "ADMIN"),
  cancelEvent
);

router.patch(
  "/:id/complete",
  authMiddleware,
  roleMiddleware(
    "ORGANIZER",
    "ADMIN"
  ),
  completeEvent
);

module.exports = router;
