import express from "express";
import getDB from "../config/database.js";
import { authenticateToken } from "../middleware/auth.js";

const router = express.Router();

// Apply auth middleware to all routes
router.use(authenticateToken);

// Get all transactions for current user with filters
router.get("/", async (req, res) => {
  try {
    const db = await getDB();
    const {
      type,
      wallet_id,
      category_id,
      start_date,
      end_date,
      search,
      limit = 50,
      offset = 0,
    } = req.query;

    let query = `
      SELECT t.*, 
             w.name as wallet_name, w.icon as wallet_icon, w.color as wallet_color,
             c.name as category_name, c.icon as category_icon, c.color as category_color
      FROM transactions t
      LEFT JOIN wallets w ON t.wallet_id = w.id
      LEFT JOIN categories c ON t.category_id = c.id
      WHERE t.user_id = ?
    `;
    const params = [req.user.id];

    if (type && ["income", "expense"].includes(type)) {
      query += " AND t.type = ?";
      params.push(type);
    }

    if (wallet_id) {
      query += " AND t.wallet_id = ?";
      params.push(wallet_id);
    }

    if (category_id) {
      query += " AND t.category_id = ?";
      params.push(category_id);
    }

    if (start_date) {
      query += " AND t.date >= ?";
      params.push(start_date);
    }

    if (end_date) {
      query += " AND t.date <= ?";
      params.push(end_date);
    }

    if (search) {
      query += " AND t.description LIKE ?";
      params.push(`%${search}%`);
    }

    // Get total count for pagination - build count query separately
    let countQuery = `
      SELECT COUNT(*) as total
      FROM transactions t
      WHERE t.user_id = ?
    `;
    const countParams = [req.user.id];

    if (type && ["income", "expense"].includes(type)) {
      countQuery += " AND t.type = ?";
      countParams.push(type);
    }
    if (wallet_id) {
      countQuery += " AND t.wallet_id = ?";
      countParams.push(wallet_id);
    }
    if (category_id) {
      countQuery += " AND t.category_id = ?";
      countParams.push(category_id);
    }
    if (start_date) {
      countQuery += " AND t.date >= ?";
      countParams.push(start_date);
    }
    if (end_date) {
      countQuery += " AND t.date <= ?";
      countParams.push(end_date);
    }
    if (search) {
      countQuery += " AND t.description LIKE ?";
      countParams.push(`%${search}%`);
    }

    const countResult = db.prepare(countQuery).get(...countParams);
    const total = countResult?.total || 0;

    query += " ORDER BY t.date DESC, t.created_at DESC LIMIT ? OFFSET ?";
    params.push(Number(limit), Number(offset));

    const transactions = db.prepare(query).all(...params);

    res.json({
      transactions,
      pagination: {
        total,
        limit: Number(limit),
        offset: Number(offset),
        hasMore: Number(offset) + transactions.length < total,
      },
    });
  } catch (error) {
    console.error("Get transactions error:", error);
    res.status(500).json({ error: "Failed to fetch transactions" });
  }
});

// Get single transaction
router.get("/:id", async (req, res) => {
  try {
    const db = await getDB();
    const transaction = db
      .prepare(
        `
      SELECT t.*, 
             w.name as wallet_name, w.icon as wallet_icon,
             c.name as category_name, c.icon as category_icon
      FROM transactions t
      LEFT JOIN wallets w ON t.wallet_id = w.id
      LEFT JOIN categories c ON t.category_id = c.id
      WHERE t.id = ? AND t.user_id = ?
    `,
      )
      .get(req.params.id, req.user.id);

    if (!transaction) {
      return res.status(404).json({ error: "Transaction not found" });
    }

    res.json(transaction);
  } catch (error) {
    console.error("Get transaction error:", error);
    res.status(500).json({ error: "Failed to fetch transaction" });
  }
});

// Create new transaction
router.post("/", async (req, res) => {
  try {
    const db = await getDB();
    const {
      wallet_id,
      category_id,
      type,
      amount,
      description,
      date,
      proof_image,
    } = req.body;

    if (!wallet_id || !category_id || !type || !amount || !date) {
      return res.status(400).json({
        error: "wallet_id, category_id, type, amount, and date are required",
      });
    }

    if (!["income", "expense"].includes(type)) {
      return res.status(400).json({ error: "Invalid transaction type" });
    }

    if (amount <= 0) {
      return res.status(400).json({ error: "Amount must be positive" });
    }

    // Verify wallet and category belong to user
    const wallet = db
      .prepare("SELECT * FROM wallets WHERE id = ? AND user_id = ?")
      .get(wallet_id, req.user.id);
    const category = db
      .prepare("SELECT * FROM categories WHERE id = ? AND user_id = ?")
      .get(category_id, req.user.id);

    if (!wallet) {
      return res.status(400).json({ error: "Invalid wallet" });
    }

    if (!category) {
      return res.status(400).json({ error: "Invalid category" });
    }

    // Insert transaction
    const result = db
      .prepare(
        `
      INSERT INTO transactions (user_id, wallet_id, category_id, type, amount, description, date, proof_image)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `,
      )
      .run(
        req.user.id,
        wallet_id,
        category_id,
        type,
        amount,
        description || "",
        date,
        proof_image || null,
      );

    // Update wallet balance
    const balanceChange = type === "income" ? amount : -amount;
    db.prepare("UPDATE wallets SET balance = balance + ? WHERE id = ?").run(
      balanceChange,
      wallet_id,
    );

    const transaction = db
      .prepare(
        `
      SELECT t.*, 
             w.name as wallet_name, w.icon as wallet_icon, w.color as wallet_color,
             c.name as category_name, c.icon as category_icon, c.color as category_color
      FROM transactions t
      LEFT JOIN wallets w ON t.wallet_id = w.id
      LEFT JOIN categories c ON t.category_id = c.id
      WHERE t.id = ?
    `,
      )
      .get(result.lastInsertRowid);

    res.status(201).json(transaction);
  } catch (error) {
    console.error("Create transaction error:", error);
    res.status(500).json({ error: "Failed to create transaction" });
  }
});

// Update transaction
router.put("/:id", async (req, res) => {
  try {
    const db = await getDB();
    const {
      wallet_id,
      category_id,
      type,
      amount,
      description,
      date,
      proof_image,
    } = req.body;

    // Get existing transaction
    const existingTx = db
      .prepare(
        `
      SELECT * FROM transactions WHERE id = ? AND user_id = ?
    `,
      )
      .get(req.params.id, req.user.id);

    if (!existingTx) {
      return res.status(404).json({ error: "Transaction not found" });
    }

    // Revert old balance change
    const oldBalanceChange =
      existingTx.type === "income" ? -existingTx.amount : existingTx.amount;
    db.prepare("UPDATE wallets SET balance = balance + ? WHERE id = ?").run(
      oldBalanceChange,
      existingTx.wallet_id,
    );

    // Update transaction
    const newWalletId = wallet_id || existingTx.wallet_id;
    const newCategoryId = category_id || existingTx.category_id;
    const newType = type || existingTx.type;
    const newAmount = amount || existingTx.amount;
    const newDescription =
      description !== undefined ? description : existingTx.description;
    const newDate = date || existingTx.date;
    const newProofImage =
      proof_image !== undefined ? proof_image : existingTx.proof_image;

    db.prepare(
      `
      UPDATE transactions 
      SET wallet_id = ?, category_id = ?, type = ?, amount = ?, description = ?, date = ?, proof_image = ?
      WHERE id = ? AND user_id = ?
    `,
    ).run(
      newWalletId,
      newCategoryId,
      newType,
      newAmount,
      newDescription,
      newDate,
      newProofImage,
      req.params.id,
      req.user.id,
    );

    // Apply new balance change
    const newBalanceChange = newType === "income" ? newAmount : -newAmount;
    db.prepare("UPDATE wallets SET balance = balance + ? WHERE id = ?").run(
      newBalanceChange,
      newWalletId,
    );

    const transaction = db
      .prepare(
        `
      SELECT t.*, 
             w.name as wallet_name, w.icon as wallet_icon, w.color as wallet_color,
             c.name as category_name, c.icon as category_icon, c.color as category_color
      FROM transactions t
      LEFT JOIN wallets w ON t.wallet_id = w.id
      LEFT JOIN categories c ON t.category_id = c.id
      WHERE t.id = ?
    `,
      )
      .get(req.params.id);

    res.json(transaction);
  } catch (error) {
    console.error("Update transaction error:", error);
    res.status(500).json({ error: "Failed to update transaction" });
  }
});

// Delete transaction
router.delete("/:id", async (req, res) => {
  try {
    const db = await getDB();
    const transaction = db
      .prepare(
        `
      SELECT * FROM transactions WHERE id = ? AND user_id = ?
    `,
      )
      .get(req.params.id, req.user.id);

    if (!transaction) {
      return res.status(404).json({ error: "Transaction not found" });
    }

    // Revert balance change
    const balanceChange =
      transaction.type === "income" ? -transaction.amount : transaction.amount;
    db.prepare("UPDATE wallets SET balance = balance + ? WHERE id = ?").run(
      balanceChange,
      transaction.wallet_id,
    );

    // Delete transaction
    db.prepare("DELETE FROM transactions WHERE id = ? AND user_id = ?").run(
      req.params.id,
      req.user.id,
    );

    res.json({ message: "Transaction deleted successfully" });
  } catch (error) {
    console.error("Delete transaction error:", error);
    res.status(500).json({ error: "Failed to delete transaction" });
  }
});

export default router;
