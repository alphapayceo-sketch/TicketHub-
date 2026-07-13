const router = require("express").Router();
const authMiddleware = require("../middleware/authMiddleware");
const {
  createReview,
  getEventReviews,
  updateReview,
  deleteReview,
  getUserReviews,
  getTopRatedEvents,
  getReviewStats
} = require("../controllers/reviewController");

// Create a review for an event
router.post("/", authMiddleware, createReview);

// Get reviews for an event
router.get("/event/:eventId", getEventReviews);

// Update user's own review
router.put("/:reviewId", authMiddleware, updateReview);

// Delete user's own review
router.delete("/:reviewId", authMiddleware, deleteReview);

// Get all reviews by current user
router.get("/my-reviews", authMiddleware, getUserReviews);

// Get top rated events
router.get("/top-rated", getTopRatedEvents);

// Get review statistics for an event
router.get("/stats/:eventId", getReviewStats);

module.exports = router;
