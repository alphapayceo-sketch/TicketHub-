const router = require("express").Router();
const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");
const {
  createCategory,
  getCategories,
  getCategory,
  updateCategory,
  deleteCategory,
  addEventToCategory,
  removeEventFromCategory,
  getEventsByCategory,
  getEventCategories
} = require("../controllers/eventCategoryController");

// CRUD for categories (admin only)
router.post("/", authMiddleware, roleMiddleware("ADMIN"), createCategory);
router.get("/", getCategories);
router.get("/:categoryId", getCategory);
router.put("/:categoryId", authMiddleware, roleMiddleware("ADMIN"), updateCategory);
router.delete("/:categoryId", authMiddleware, roleMiddleware("ADMIN"), deleteCategory);

// Add/remove event from category
router.post("/:categoryId/events", authMiddleware, roleMiddleware("ADMIN"), addEventToCategory);
router.delete("/:categoryId/events/:eventId", authMiddleware, roleMiddleware("ADMIN"), removeEventFromCategory);

// Get events by category
router.get("/:categoryId/events", getEventsByCategory);

// Get categories for an event
router.get("/event/:eventId/categories", getEventCategories);

module.exports = router;
