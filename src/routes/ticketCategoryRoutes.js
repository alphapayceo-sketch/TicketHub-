const router = require("express").Router();
const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");
const {
  createTicketCategory,
  getTicketCategories,
  updateTicketCategory,
  deleteTicketCategory,
  getCategoryAvailability
} = require("../controllers/ticketCategoryController");

// Create ticket category (organizer/admin only)
router.post("/", authMiddleware, roleMiddleware("ORGANIZER", "ADMIN"), createTicketCategory);

// Get ticket categories for an event
router.get("/event/:eventId", getTicketCategories);

// Get availability for a category
router.get("/:categoryId/availability", getCategoryAvailability);

// Update ticket category
router.put("/:categoryId", authMiddleware, roleMiddleware("ORGANIZER", "ADMIN"), updateTicketCategory);

// Delete ticket category
router.delete("/:categoryId", authMiddleware, roleMiddleware("ORGANIZER", "ADMIN"), deleteTicketCategory);

module.exports = router;
