import express from "express";
import getDB from "../config/database.js";
import { authenticateToken } from "../middleware/auth.js";

const router = express.Router();

// Apply auth middleware to all routes
router.use(authenticateToken);

// Get all budgets for current user
router.get("/", async (req, res) => {
  try {
    const db = await getDB();
    const budgets = db
      .prepare(
        `
      SELECT b.*, 
             c.name as category_name, c.icon as category_icon, c.color as category_color
      FROM budgets b
      LEFT JOIN categories c ON b.category_id = c.id
      WHERE b.user_id = ?
      ORDER BY b.start_date DESC
    `,
      )
      .all(req.user.id);

    // Calculate spent amount for each budget
    const budgetsWithSpent = budgets.map((budget) => {
      const now = new Date();
      let startDate, endDate;

      if (budget.period === "monthly") {
        startDate = new Date(now.getFullYear(), now.getMonth(), 1)
          .toISOString()
          .split("T")[0];
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0)
          .toISOString()
          .split("T")[0];
      } else {
        // Weekly
        const dayOfWeek = now.getDay();
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - dayOfWeek);
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        startDate = startOfWeek.toISOString().split("T")[0];
        endDate = endOfWeek.toISOString().split("T")[0];
      }

      const spent = db
        .prepare(
          `
        SELECT COALESCE(SUM(amount), 0) as total
        FROM transactions
        WHERE user_id = ? AND category_id = ? AND type = 'expense'
        AND date >= ? AND date <= ?
      `,
        )
        .get(req.user.id, budget.category_id, startDate, endDate);

      return {
        ...budget,
        spent: spent.total,
        remaining: budget.amount - spent.total,
        percentage: Math.round((spent.total / budget.amount) * 100),
      };
    });

    res.json(budgetsWithSpent);
  } catch (error) {
    console.error("Get budgets error:", error);
    res.status(500).json({ error: "Failed to fetch budgets" });
  }
});

// Get single budget
router.get("/:id", async (req, res) => {
  try {
    const db = await getDB();
    const budget = db
      .prepare(
        `
      SELECT b.*, 
             c.name as category_name, c.icon as category_icon, c.color as category_color
      FROM budgets b
      LEFT JOIN categories c ON b.category_id = c.id
      WHERE b.id = ? AND b.user_id = ?
    `,
      )
      .get(req.params.id, req.user.id);

    if (!budget) {
      return res.status(404).json({ error: "Budget not found" });
    }

    res.json(budget);
  } catch (error) {
    console.error("Get budget error:", error);
    res.status(500).json({ error: "Failed to fetch budget" });
  }
});

// Create new budget
router.post("/", async (req, res) => {
  try {
    const db = await getDB();
    const { category_id, amount, period = "monthly" } = req.body;

    if (!category_id || !amount) {
      return res
        .status(400)
        .json({ error: "category_id and amount are required" });
    }

    if (!["monthly", "weekly"].includes(period)) {
      return res
        .status(400)
        .json({ error: "Invalid period. Use monthly or weekly" });
    }

    if (amount <= 0) {
      return res.status(400).json({ error: "Amount must be positive" });
    }

    // Verify category belongs to user and is expense type
    const category = db
      .prepare(
        `
      SELECT * FROM categories WHERE id = ? AND user_id = ? AND type = 'expense'
    `,
      )
      .get(category_id, req.user.id);

    if (!category) {
      return res
        .status(400)
        .json({ error: "Invalid category or category is not expense type" });
    }

    // Check if budget already exists for this category
    const existingBudget = db
      .prepare(
        `
      SELECT * FROM budgets WHERE category_id = ? AND user_id = ?
    `,
      )
      .get(category_id, req.user.id);

    if (existingBudget) {
      return res
        .status(400)
        .json({ error: "Budget already exists for this category" });
    }

    const startDate = new Date().toISOString().split("T")[0];

    const result = db
      .prepare(
        `
      INSERT INTO budgets (user_id, category_id, amount, period, start_date)
      VALUES (?, ?, ?, ?, ?)
    `,
      )
      .run(req.user.id, category_id, amount, period, startDate);

    const budget = db
      .prepare(
        `
      SELECT b.*, 
             c.name as category_name, c.icon as category_icon, c.color as category_color
      FROM budgets b
      LEFT JOIN categories c ON b.category_id = c.id
      WHERE b.id = ?
    `,
      )
      .get(result.lastInsertRowid);

    res
      .status(201)
      .json({ ...budget, spent: 0, remaining: amount, percentage: 0 });
  } catch (error) {
    console.error("Create budget error:", error);
    res.status(500).json({ error: "Failed to create budget" });
  }
});

// Update budget
router.put("/:id", async (req, res) => {
  try {
    const db = await getDB();
    const { amount, period } = req.body;

    const budget = db
      .prepare(
        `
      SELECT * FROM budgets WHERE id = ? AND user_id = ?
    `,
      )
      .get(req.params.id, req.user.id);

    if (!budget) {
      return res.status(404).json({ error: "Budget not found" });
    }

    db.prepare(
      `
      UPDATE budgets 
      SET amount = COALESCE(?, amount),
          period = COALESCE(?, period)
      WHERE id = ? AND user_id = ?
    `,
    ).run(amount, period, req.params.id, req.user.id);

    const updatedBudget = db
      .prepare(
        `
      SELECT b.*, 
             c.name as category_name, c.icon as category_icon, c.color as category_color
      FROM budgets b
      LEFT JOIN categories c ON b.category_id = c.id
      WHERE b.id = ?
    `,
      )
      .get(req.params.id);

    res.json(updatedBudget);
  } catch (error) {
    console.error("Update budget error:", error);
    res.status(500).json({ error: "Failed to update budget" });
  }
});

// Delete budget
router.delete("/:id", async (req, res) => {
  try {
    const db = await getDB();
    const budget = db
      .prepare(
        `
      SELECT * FROM budgets WHERE id = ? AND user_id = ?
    `,
      )
      .get(req.params.id, req.user.id);

    if (!budget) {
      return res.status(404).json({ error: "Budget not found" });
    }

    db.prepare("DELETE FROM budgets WHERE id = ? AND user_id = ?").run(
      req.params.id,
      req.user.id,
    );

    res.json({ message: "Budget deleted successfully" });
  } catch (error) {
    console.error("Delete budget error:", error);
    res.status(500).json({ error: "Failed to delete budget" });
  }
});

export default router;
