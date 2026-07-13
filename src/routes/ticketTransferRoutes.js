const router = require("express").Router();
const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");
const {
  transferTicket,
  getTransferHistory,
  getUserTransferredTickets,
  getEventTransfers
} = require("../controllers/ticketTransferController");

// Transfer a ticket to another user
router.post("/", authMiddleware, transferTicket);

// Get transfer history for current user
router.get("/my-history", authMiddleware, getTransferHistory);

// Get tickets that were transferred to current user
router.get("/received", authMiddleware, getUserTransferredTickets);

// Get all transfers for an event (organizer only)
router.get("/event/:eventId", authMiddleware, roleMiddleware("ORGANIZER", "ADMIN"), getEventTransfers);

module.exports = router;
