const db = require("../config/db");
const { v4: uuidv4 } = require("uuid");

/**
 * Event Categories Controller
 * Manages event tags and categories
 */

exports.createCategory = async (req, res) => {
  try {
    const { name, description } = req.body;

    if (!name) {
      return res.status(400).json({ error: "Category name required" });
    }

    const categoryId = uuidv4();
    await db.query(
      "INSERT INTO event_categories (id, name, description) VALUES ($1, $2, $3)",
      [categoryId, name, description || null]
    );

    res.status(201).json({
      message: "Category created",
      categoryId
    });
  } catch (error) {
    if (error.constraint === 'event_categories_name_key') {
      return res.status(400).json({ error: "Category name already exists" });
    }
    console.error("Error creating category:", error);
    res.status(500).json({ error: "Failed to create category" });
  }
};

exports.getCategories = async (req, res) => {
  try {
    const result = await db.query(
      `SELECT 
        ec.id,
        ec.name,
        ec.description,
        ec.created_at,
        COUNT(ecm.event_id) as event_count
       FROM event_categories ec
       LEFT JOIN event_category_mapping ecm ON ec.id = ecm.category_id
       GROUP BY ec.id
       ORDER BY event_count DESC, ec.name ASC`
    );

    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching categories:", error);
    res.status(500).json({ error: "Failed to fetch categories" });
  }
};

exports.getCategory = async (req, res) => {
  try {
    const { categoryId } = req.params;

    const result = await db.query(
      `SELECT 
        id,
        name,
        description,
        created_at
       FROM event_categories 
       WHERE id = $1`,
      [categoryId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Category not found" });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error fetching category:", error);
    res.status(500).json({ error: "Failed to fetch category" });
  }
};

exports.updateCategory = async (req, res) => {
  try {
    const { categoryId } = req.params;
    const { name, description } = req.body;

    await db.query(
      `UPDATE event_categories 
       SET name = COALESCE($1, name),
           description = COALESCE($2, description)
       WHERE id = $3`,
      [name || null, description || null, categoryId]
    );

    res.json({ message: "Category updated" });
  } catch (error) {
    console.error("Error updating category:", error);
    res.status(500).json({ error: "Failed to update category" });
  }
};

exports.deleteCategory = async (req, res) => {
  try {
    const { categoryId } = req.params;

    await db.query("DELETE FROM event_category_mapping WHERE category_id = $1", [categoryId]);
    await db.query("DELETE FROM event_categories WHERE id = $1", [categoryId]);

    res.json({ message: "Category deleted" });
  } catch (error) {
    console.error("Error deleting category:", error);
    res.status(500).json({ error: "Failed to delete category" });
  }
};

exports.addEventToCategory = async (req, res) => {
  try {
    const { categoryId } = req.params;
    const { eventId } = req.body;

    if (!eventId) {
      return res.status(400).json({ error: "Event ID required" });
    }

    // Check if already mapped
    const existing = await db.query(
      "SELECT id FROM event_category_mapping WHERE event_id = $1 AND category_id = $2",
      [eventId, categoryId]
    );

    if (existing.rows.length > 0) {
      return res.status(400).json({ error: "Event already in this category" });
    }

    await db.query(
      "INSERT INTO event_category_mapping (event_id, category_id) VALUES ($1, $2)",
      [eventId, categoryId]
    );

    res.status(201).json({ message: "Event added to category" });
  } catch (error) {
    console.error("Error adding event to category:", error);
    res.status(500).json({ error: "Failed to add event to category" });
  }
};

exports.removeEventFromCategory = async (req, res) => {
  try {
    const { categoryId, eventId } = req.params;

    await db.query(
      "DELETE FROM event_category_mapping WHERE event_id = $1 AND category_id = $2",
      [eventId, categoryId]
    );

    res.json({ message: "Event removed from category" });
  } catch (error) {
    console.error("Error removing event from category:", error);
    res.status(500).json({ error: "Failed to remove event from category" });
  }
};

exports.getEventsByCategory = async (req, res) => {
  try {
    const { categoryId } = req.params;
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    // Verify category exists
    const categoryResult = await db.query(
      "SELECT name FROM event_categories WHERE id = $1",
      [categoryId]
    );

    if (categoryResult.rows.length === 0) {
      return res.status(404).json({ error: "Category not found" });
    }

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
        e.status
       FROM events e
       JOIN event_category_mapping ecm ON e.id = ecm.event_id
       WHERE ecm.category_id = $1
       ORDER BY e.date ASC
       LIMIT $2 OFFSET $3`,
      [categoryId, limit, offset]
    );

    // Get total count
    const countResult = await db.query(
      "SELECT COUNT(*) as total FROM event_category_mapping WHERE category_id = $1",
      [categoryId]
    );

    res.json({
      category: categoryResult.rows[0].name,
      categoryId,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: parseInt(countResult.rows[0].total)
      },
      events: result.rows
    });
  } catch (error) {
    console.error("Error fetching events by category:", error);
    res.status(500).json({ error: "Failed to fetch events" });
  }
};

exports.getEventCategories = async (req, res) => {
  try {
    const { eventId } = req.params;

    const result = await db.query(
      `SELECT 
        ec.id,
        ec.name,
        ec.description
       FROM event_categories ec
       JOIN event_category_mapping ecm ON ec.id = ecm.category_id
       WHERE ecm.event_id = $1`,
      [eventId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching event categories:", error);
    res.status(500).json({ error: "Failed to fetch event categories" });
  }
};
