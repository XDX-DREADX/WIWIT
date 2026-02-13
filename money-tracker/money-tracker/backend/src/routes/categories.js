import express from "express";
import getDB from "../config/database.js";
import { authenticateToken } from "../middleware/auth.js";

const router = express.Router();

// Apply auth middleware to all routes
router.use(authenticateToken);

// Get all categories for current user
router.get("/", async (req, res) => {
  try {
    const db = await getDB();
    const { type } = req.query;

    let query = "SELECT * FROM categories WHERE user_id = ?";
    const params = [req.user.id];

    if (type && ["income", "expense"].includes(type)) {
      query += " AND type = ?";
      params.push(type);
    }

    query += " ORDER BY type, name";

    const categories = db.prepare(query).all(...params);

    res.json(categories);
  } catch (error) {
    console.error("Get categories error:", error);
    res.status(500).json({ error: "Failed to fetch categories" });
  }
});

// Get single category
router.get("/:id", async (req, res) => {
  try {
    const db = await getDB();
    const category = db
      .prepare(
        `
      SELECT * FROM categories WHERE id = ? AND user_id = ?
    `,
      )
      .get(req.params.id, req.user.id);

    if (!category) {
      return res.status(404).json({ error: "Category not found" });
    }

    res.json(category);
  } catch (error) {
    console.error("Get category error:", error);
    res.status(500).json({ error: "Failed to fetch category" });
  }
});

// Create new category
router.post("/", async (req, res) => {
  try {
    const db = await getDB();
    const { name, type, icon = "📁", color = "#6366f1" } = req.body;

    if (!name || !type) {
      return res.status(400).json({ error: "Name and type are required" });
    }

    if (!["income", "expense"].includes(type)) {
      return res.status(400).json({ error: "Invalid category type" });
    }

    const result = db
      .prepare(
        `
      INSERT INTO categories (user_id, name, type, icon, color)
      VALUES (?, ?, ?, ?, ?)
    `,
      )
      .run(req.user.id, name, type, icon, color);

    const category = db
      .prepare("SELECT * FROM categories WHERE id = ?")
      .get(result.lastInsertRowid);

    res.status(201).json(category);
  } catch (error) {
    console.error("Create category error:", error);
    res.status(500).json({ error: "Failed to create category" });
  }
});

// Update category
router.put("/:id", async (req, res) => {
  try {
    const db = await getDB();
    const { name, type, icon, color } = req.body;

    const category = db
      .prepare(
        `
      SELECT * FROM categories WHERE id = ? AND user_id = ?
    `,
      )
      .get(req.params.id, req.user.id);

    if (!category) {
      return res.status(404).json({ error: "Category not found" });
    }

    db.prepare(
      `
      UPDATE categories 
      SET name = COALESCE(?, name),
          type = COALESCE(?, type),
          icon = COALESCE(?, icon),
          color = COALESCE(?, color)
      WHERE id = ? AND user_id = ?
    `,
    ).run(name, type, icon, color, req.params.id, req.user.id);

    const updatedCategory = db
      .prepare("SELECT * FROM categories WHERE id = ?")
      .get(req.params.id);

    res.json(updatedCategory);
  } catch (error) {
    console.error("Update category error:", error);
    res.status(500).json({ error: "Failed to update category" });
  }
});

// Delete category
router.delete("/:id", async (req, res) => {
  try {
    const db = await getDB();
    const category = db
      .prepare(
        `
      SELECT * FROM categories WHERE id = ? AND user_id = ?
    `,
      )
      .get(req.params.id, req.user.id);

    if (!category) {
      return res.status(404).json({ error: "Category not found" });
    }

    // Check if category is used in transactions
    const usedInTransactions = db
      .prepare(
        `
      SELECT COUNT(*) as count FROM transactions WHERE category_id = ?
    `,
      )
      .get(req.params.id);

    if (usedInTransactions.count > 0) {
      return res.status(400).json({
        error:
          "Cannot delete category that has transactions. Delete transactions first.",
      });
    }

    db.prepare("DELETE FROM categories WHERE id = ? AND user_id = ?").run(
      req.params.id,
      req.user.id,
    );

    res.json({ message: "Category deleted successfully" });
  } catch (error) {
    console.error("Delete category error:", error);
    res.status(500).json({ error: "Failed to delete category" });
  }
});

export default router;
