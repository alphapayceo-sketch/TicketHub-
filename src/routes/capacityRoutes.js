const router = require("express").Router();
const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");
const {
  getEventCapacity,
  getMultipleEventCapacity,
  logCapacitySnapshot,
  getCapacityHistory,
  getCapacityAlerts,
  updateEventCapacity
} = require("../controllers/capacityController");

// Get capacity for a single event
router.get("/event/:eventId", getEventCapacity);

// Get capacity for multiple events
router.post("/batch", getMultipleEventCapacity);

// Log capacity snapshot
router.post("/event/:eventId/snapshot", authMiddleware, roleMiddleware("ORGANIZER", "ADMIN"), logCapacitySnapshot);

// Get capacity history
router.get("/event/:eventId/history", authMiddleware, roleMiddleware("ORGANIZER", "ADMIN"), getCapacityHistory);

// Get capacity alerts (admin only)
router.get("/alerts", authMiddleware, roleMiddleware("ADMIN"), getCapacityAlerts);

// Update event capacity
router.put("/event/:eventId", authMiddleware, updateEventCapacity);

module.exports = router;
