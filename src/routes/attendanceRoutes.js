const router = require("express").Router();
const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");
const {
  recordAttendance,
  getAttendanceLog,
  getEventAttendance,
  getAttendanceStats,
  bulkScanTickets,
  getLocationStats
} = require("../controllers/attendanceController");

// Record single ticket scan/attendance
router.post("/scan", authMiddleware, roleMiddleware("ORGANIZER", "ADMIN"), recordAttendance);

// Bulk scan multiple tickets
router.post("/scan/bulk", authMiddleware, roleMiddleware("ORGANIZER", "ADMIN"), bulkScanTickets);

// Get attendance log for a specific ticket
router.get("/ticket/:ticketId", authMiddleware, getAttendanceLog);

// Get attendance for an event
router.get("/event/:eventId", authMiddleware, roleMiddleware("ORGANIZER", "ADMIN"), getEventAttendance);

// Get attendance statistics for an event
router.get("/event/:eventId/stats", authMiddleware, roleMiddleware("ORGANIZER", "ADMIN"), getAttendanceStats);

// Get attendance stats by location
router.get("/event/:eventId/locations", authMiddleware, roleMiddleware("ORGANIZER", "ADMIN"), getLocationStats);

module.exports = router;
