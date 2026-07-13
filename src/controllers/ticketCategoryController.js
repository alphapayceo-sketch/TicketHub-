const db = require("../config/db");
const { v4: uuidv4 } = require("uuid");

/**
 * Ticket Categories Controller
 * Manages ticket tiers (VIP, General, Early Bird, etc)
 */

exports.createTicketCategory = async (req, res) => {
  try {
    const { eventId, name, description, price, quantity, benefits } = req.body;

    if (!eventId || !name || !price || !quantity) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const categoryId = uuidv4();
    
    await db.query(
      `INSERT INTO ticket_categories (id, event_id, name, description, price, quantity_available, benefits)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [categoryId, eventId, name, description, price, quantity, benefits]
    );

    res.status(201).json({
      message: "Ticket category created",
      categoryId
    });
  } catch (error) {
    console.error("Error creating ticket category:", error);
    res.status(500).json({ error: "Failed to create ticket category" });
  }
};

exports.getTicketCategories = async (req, res) => {
  try {
    const { eventId } = req.params;

    const result = await db.query(
      `SELECT * FROM ticket_categories 
       WHERE event_id = $1
       ORDER BY price ASC`,
      [eventId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching ticket categories:", error);
    res.status(500).json({ error: "Failed to fetch ticket categories" });
  }
};

exports.updateTicketCategory = async (req, res) => {
  try {
    const { categoryId } = req.params;
    const { name, description, price, quantity, benefits } = req.body;

    await db.query(
      `UPDATE ticket_categories 
       SET name = COALESCE($1, name),
           description = COALESCE($2, description),
           price = COALESCE($3, price),
           quantity_available = COALESCE($4, quantity_available),
           benefits = COALESCE($5, benefits)
       WHERE id = $1`,
      [name, description, price, quantity, benefits, categoryId]
    );

    res.json({ message: "Ticket category updated" });
  } catch (error) {
    console.error("Error updating ticket category:", error);
    res.status(500).json({ error: "Failed to update ticket category" });
  }
};

exports.deleteTicketCategory = async (req, res) => {
  try {
    const { categoryId } = req.params;

    await db.query("DELETE FROM ticket_categories WHERE id = $1", [categoryId]);

    res.json({ message: "Ticket category deleted" });
  } catch (error) {
    console.error("Error deleting ticket category:", error);
    res.status(500).json({ error: "Failed to delete ticket category" });
  }
};

exports.getCategoryAvailability = async (req, res) => {
  try {
    const { categoryId } = req.params;

    const result = await db.query(
      `SELECT 
        id,
        name,
        price,
        quantity_available,
        quantity_sold,
        (quantity_available - quantity_sold) as tickets_remaining
       FROM ticket_categories 
       WHERE id = $1`,
      [categoryId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Category not found" });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error fetching category availability:", error);
    res.status(500).json({ error: "Failed to fetch category availability" });
  }
};
