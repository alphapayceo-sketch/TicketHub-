const router = require("express").Router();
const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");
const {
  createSeats,
  getSeatsByEvent,
  getSeatsBySection,
  updateSeatStatus,
  getAvailableSeats,
  getSeatChart,
  blockSeats
} = require("../controllers/seatController");

// Create seats for an event
router.post("/", authMiddleware, roleMiddleware("ORGANIZER", "ADMIN"), createSeats);

// Get all seats for an event
router.get("/event/:eventId", getSeatsByEvent);

// Get seats by section
router.get("/event/:eventId/section/:section", getSeatsBySection);

// Get available seats for an event
router.get("/event/:eventId/available", getAvailableSeats);

// Get seat chart (visual representation)
router.get("/event/:eventId/chart", getSeatChart);

// Update seat status
router.patch("/:seatId", authMiddleware, roleMiddleware("ORGANIZER", "ADMIN"), updateSeatStatus);

// Block multiple seats
router.post("/event/:eventId/block", authMiddleware, roleMiddleware("ORGANIZER", "ADMIN"), blockSeats);

module.exports = router;
