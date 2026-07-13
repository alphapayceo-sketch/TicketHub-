const db = require("../config/db");
const { v4: uuidv4 } = require("uuid");

/**
 * Favorites Controller
 * Manages user's favorite events (watchlist)
 */

exports.addFavorite = async (req, res) => {
  try {
    const { eventId } = req.body;
    const userId = req.user.id;

    if (!eventId) {
      return res.status(400).json({ error: "Event ID required" });
    }

    // Check if event exists
    const eventResult = await db.query(
      "SELECT id FROM events WHERE id = $1",
      [eventId]
    );

    if (eventResult.rows.length === 0) {
      return res.status(404).json({ error: "Event not found" });
    }

    // Check if already favorited
    const existingFav = await db.query(
      "SELECT id FROM favorites WHERE user_id = $1 AND event_id = $2",
      [userId, eventId]
    );

    if (existingFav.rows.length > 0) {
      return res.status(400).json({ error: "Event already in favorites" });
    }

    const favoriteId = uuidv4();
    await db.query(
      "INSERT INTO favorites (id, user_id, event_id) VALUES ($1, $2, $3)",
      [favoriteId, userId, eventId]
    );

    res.status(201).json({
      message: "Event added to favorites",
      favoriteId
    });
  } catch (error) {
    console.error("Error adding favorite:", error);
    res.status(500).json({ error: "Failed to add favorite" });
  }
};

exports.removeFavorite = async (req, res) => {
  try {
    const { eventId } = req.params;
    const userId = req.user.id;

    const result = await db.query(
      "DELETE FROM favorites WHERE user_id = $1 AND event_id = $2 RETURNING id",
      [userId, eventId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Favorite not found" });
    }

    res.json({ message: "Event removed from favorites" });
  } catch (error) {
    console.error("Error removing favorite:", error);
    res.status(500).json({ error: "Failed to remove favorite" });
  }
};

exports.getUserFavorites = async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    const result = await db.query(
      `SELECT 
        e.id,
        e.title,
        e.description,
        e.location,
        e.date,
        e.time,
        e.ticket_price,
        e.capacity,
        e.image_url,
        e.status,
        f.created_at as added_at,
        COUNT(t.id) as tickets_sold
       FROM favorites f
       JOIN events e ON f.event_id = e.id
       LEFT JOIN tickets t ON e.id = t.event_id
       WHERE f.user_id = $1
       GROUP BY e.id, f.created_at
       ORDER BY f.created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );

    // Get total count
    const countResult = await db.query(
      "SELECT COUNT(*) as total FROM favorites WHERE user_id = $1",
      [userId]
    );

    res.json({
      total: countResult.rows[0].total,
      page: parseInt(page),
      limit: parseInt(limit),
      favorites: result.rows
    });
  } catch (error) {
    console.error("Error fetching favorites:", error);
    res.status(500).json({ error: "Failed to fetch favorites" });
  }
};

exports.isFavorite = async (req, res) => {
  try {
    const { eventId } = req.params;
    const userId = req.user.id;

    const result = await db.query(
      "SELECT id FROM favorites WHERE user_id = $1 AND event_id = $2",
      [userId, eventId]
    );

    res.json({
      eventId,
      isFavorite: result.rows.length > 0
    });
  } catch (error) {
    console.error("Error checking favorite status:", error);
    res.status(500).json({ error: "Failed to check favorite status" });
  }
};

exports.getFavoriteCount = async (req, res) => {
  try {
    const { eventId } = req.params;

    const result = await db.query(
      "SELECT COUNT(*) as count FROM favorites WHERE event_id = $1",
      [eventId]
    );

    res.json({
      eventId,
      favoriteCount: parseInt(result.rows[0].count)
    });
  } catch (error) {
    console.error("Error getting favorite count:", error);
    res.status(500).json({ error: "Failed to get favorite count" });
  }
};

exports.getPopularFavorites = async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    const result = await db.query(
      `SELECT 
        e.id,
        e.title,
        e.description,
        e.location,
        e.date,
        e.time,
        e.ticket_price,
        e.image_url,
        COUNT(f.id) as favorite_count
       FROM events e
       JOIN favorites f ON e.id = f.event_id
       GROUP BY e.id
       ORDER BY favorite_count DESC
       LIMIT $1`,
      [limit]
    );

    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching popular favorites:", error);
    res.status(500).json({ error: "Failed to fetch popular favorites" });
  }
};
