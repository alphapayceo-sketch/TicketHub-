const db = require("../config/db");
const { v4: uuidv4 } = require("uuid");

/**
 * Event Reviews Controller
 * Manages event ratings and reviews
 */

exports.createReview = async (req, res) => {
  try {
    const { eventId, rating, comment } = req.body;
    const userId = req.user.id;

    if (!eventId || !rating) {
      return res.status(400).json({ error: "Event ID and rating required" });
    }

    if (rating < 1 || rating > 5 || !Number.isInteger(rating)) {
      return res.status(400).json({ error: "Rating must be an integer between 1 and 5" });
    }

    // Check if user attended the event (has a ticket)
    const ticketResult = await db.query(
      `SELECT t.id FROM tickets t
       JOIN events e ON t.event_id = e.id
       WHERE t.user_id = $1 AND e.id = $2 AND t.status = 'VALID'`,
      [userId, eventId]
    );

    if (ticketResult.rows.length === 0) {
      return res.status(403).json({ error: "You must have attended this event to review it" });
    }

    // Check if user already reviewed this event
    const existingReview = await db.query(
      "SELECT id FROM event_reviews WHERE event_id = $1 AND user_id = $2",
      [eventId, userId]
    );

    if (existingReview.rows.length > 0) {
      return res.status(400).json({ error: "You have already reviewed this event" });
    }

    const reviewId = uuidv4();
    await db.query(
      `INSERT INTO event_reviews (id, event_id, user_id, rating, comment)
       VALUES ($1, $2, $3, $4, $5)`,
      [reviewId, eventId, userId, rating, comment || null]
    );

    res.status(201).json({
      message: "Review created successfully",
      reviewId
    });
  } catch (error) {
    console.error("Error creating review:", error);
    res.status(500).json({ error: "Failed to create review" });
  }
};

exports.getEventReviews = async (req, res) => {
  try {
    const { eventId } = req.params;
    const { page = 1, limit = 10, sort = 'recent' } = req.query;
    const offset = (page - 1) * limit;

    let orderBy = 'er.created_at DESC';
    if (sort === 'rating-high') orderBy = 'er.rating DESC';
    if (sort === 'rating-low') orderBy = 'er.rating ASC';

    const result = await db.query(
      `SELECT 
        er.id,
        er.rating,
        er.comment,
        er.created_at,
        u.fullname as reviewer_name,
        u.id as reviewer_id
       FROM event_reviews er
       JOIN users u ON er.user_id = u.id
       WHERE er.event_id = $1
       ORDER BY ${orderBy}
       LIMIT $2 OFFSET $3`,
      [eventId, limit, offset]
    );

    // Get summary stats
    const statsResult = await db.query(
      `SELECT 
        COUNT(*) as total_reviews,
        AVG(rating) as average_rating,
        COUNT(CASE WHEN rating = 5 THEN 1 END) as five_star,
        COUNT(CASE WHEN rating = 4 THEN 1 END) as four_star,
        COUNT(CASE WHEN rating = 3 THEN 1 END) as three_star,
        COUNT(CASE WHEN rating = 2 THEN 1 END) as two_star,
        COUNT(CASE WHEN rating = 1 THEN 1 END) as one_star
       FROM event_reviews 
       WHERE event_id = $1`,
      [eventId]
    );

    const stats = statsResult.rows[0];

    res.json({
      eventId,
      summary: {
        totalReviews: parseInt(stats.total_reviews),
        averageRating: parseFloat(stats.average_rating || 0).toFixed(2),
        distribution: {
          fiveStar: parseInt(stats.five_star),
          fourStar: parseInt(stats.four_star),
          threeStar: parseInt(stats.three_star),
          twoStar: parseInt(stats.two_star),
          oneStar: parseInt(stats.one_star)
        }
      },
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: parseInt(stats.total_reviews)
      },
      reviews: result.rows
    });
  } catch (error) {
    console.error("Error fetching reviews:", error);
    res.status(500).json({ error: "Failed to fetch reviews" });
  }
};

exports.updateReview = async (req, res) => {
  try {
    const { reviewId } = req.params;
    const { rating, comment } = req.body;
    const userId = req.user.id;

    if (rating && (rating < 1 || rating > 5)) {
      return res.status(400).json({ error: "Rating must be between 1 and 5" });
    }

    // Check if review belongs to user
    const reviewResult = await db.query(
      "SELECT id FROM event_reviews WHERE id = $1 AND user_id = $2",
      [reviewId, userId]
    );

    if (reviewResult.rows.length === 0) {
      return res.status(403).json({ error: "Not authorized to update this review" });
    }

    await db.query(
      `UPDATE event_reviews 
       SET rating = COALESCE($1, rating),
           comment = COALESCE($2, comment),
           updated_at = NOW()
       WHERE id = $3`,
      [rating || null, comment || null, reviewId]
    );

    res.json({ message: "Review updated successfully" });
  } catch (error) {
    console.error("Error updating review:", error);
    res.status(500).json({ error: "Failed to update review" });
  }
};

exports.deleteReview = async (req, res) => {
  try {
    const { reviewId } = req.params;
    const userId = req.user.id;

    // Check if review belongs to user
    const reviewResult = await db.query(
      "SELECT id FROM event_reviews WHERE id = $1 AND user_id = $2",
      [reviewId, userId]
    );

    if (reviewResult.rows.length === 0) {
      return res.status(403).json({ error: "Not authorized to delete this review" });
    }

    await db.query("DELETE FROM event_reviews WHERE id = $1", [reviewId]);

    res.json({ message: "Review deleted successfully" });
  } catch (error) {
    console.error("Error deleting review:", error);
    res.status(500).json({ error: "Failed to delete review" });
  }
};

exports.getUserReviews = async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await db.query(
      `SELECT 
        er.id,
        er.event_id,
        e.title as event_title,
        e.date,
        er.rating,
        er.comment,
        er.created_at
       FROM event_reviews er
       JOIN events e ON er.event_id = e.id
       WHERE er.user_id = $1
       ORDER BY er.created_at DESC`,
      [userId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching user reviews:", error);
    res.status(500).json({ error: "Failed to fetch user reviews" });
  }
};

exports.getTopRatedEvents = async (req, res) => {
  try {
    const { limit = 10, minReviews = 5 } = req.query;

    const result = await db.query(
      `SELECT 
        e.id,
        e.title,
        e.location,
        e.date,
        e.image_url,
        AVG(er.rating) as average_rating,
        COUNT(er.id) as review_count
       FROM events e
       LEFT JOIN event_reviews er ON e.id = er.event_id
       GROUP BY e.id
       HAVING COUNT(er.id) >= $1
       ORDER BY average_rating DESC, review_count DESC
       LIMIT $2`,
      [minReviews, limit]
    );

    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching top rated events:", error);
    res.status(500).json({ error: "Failed to fetch top rated events" });
  }
};

exports.getReviewStats = async (req, res) => {
  try {
    const { eventId } = req.params;

    const result = await db.query(
      `SELECT 
        COUNT(*) as total_reviews,
        AVG(rating)::numeric(10,2) as average_rating,
        MIN(rating) as lowest_rating,
        MAX(rating) as highest_rating,
        STDDEV(rating)::numeric(10,2) as rating_stddev
       FROM event_reviews 
       WHERE event_id = $1`,
      [eventId]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error fetching review stats:", error);
    res.status(500).json({ error: "Failed to fetch review stats" });
  }
};
