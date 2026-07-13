const router = require("express").Router();
const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");
const { 
  addFavorite,
  removeFavorite,
  getUserFavorites,
  isFavorite,
  getFavoriteCount,
  getPopularFavorites
} = require("../controllers/favoriteController");

// Add/remove from favorites
router.post("/", authMiddleware, addFavorite);
router.get("/", authMiddleware, getUserFavorites);
router.delete("/:eventId", authMiddleware, removeFavorite);

// Get user's favorites
router.get("/my-favorites", authMiddleware, getUserFavorites);

// Check if event is favorited
router.get("/check/:eventId", authMiddleware, isFavorite);

// Get favorite count for an event
router.get("/count/:eventId", getFavoriteCount);

// Get popular favorites
router.get("/popular", getPopularFavorites);

module.exports = router;
