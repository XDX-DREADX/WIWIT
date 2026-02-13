import express from "express";
import getDB from "../config/database.js";
import { authenticateToken } from "../middleware/auth.js";

const router = express.Router();

// Apply auth middleware to all routes
router.use(authenticateToken);

// Get all wallets for current user
router.get("/", async (req, res) => {
  try {
    const db = await getDB();
    const wallets = db
      .prepare(
        `
      SELECT * FROM wallets WHERE user_id = ? ORDER BY created_at DESC
    `,
      )
      .all(req.user.id);

    res.json(wallets);
  } catch (error) {
    console.error("Get wallets error:", error);
    res.status(500).json({ error: "Failed to fetch wallets" });
  }
});

// Get single wallet
router.get("/:id", async (req, res) => {
  try {
    const db = await getDB();
    const wallet = db
      .prepare(
        `
      SELECT * FROM wallets WHERE id = ? AND user_id = ?
    `,
      )
      .get(req.params.id, req.user.id);

    if (!wallet) {
      return res.status(404).json({ error: "Wallet not found" });
    }

    res.json(wallet);
  } catch (error) {
    console.error("Get wallet error:", error);
    res.status(500).json({ error: "Failed to fetch wallet" });
  }
});

// Create new wallet
router.post("/", async (req, res) => {
  try {
    const db = await getDB();
    const {
      name,
      type,
      balance = 0,
      icon = "💰",
      color = "#6366f1",
    } = req.body;

    if (!name || !type) {
      return res.status(400).json({ error: "Name and type are required" });
    }

    if (!["cash", "bank", "ewallet"].includes(type)) {
      return res.status(400).json({ error: "Invalid wallet type" });
    }

    const result = db
      .prepare(
        `
      INSERT INTO wallets (user_id, name, type, balance, icon, color)
      VALUES (?, ?, ?, ?, ?, ?)
    `,
      )
      .run(req.user.id, name, type, balance, icon, color);

    const wallet = db
      .prepare("SELECT * FROM wallets WHERE id = ?")
      .get(result.lastInsertRowid);

    res.status(201).json(wallet);
  } catch (error) {
    console.error("Create wallet error:", error);
    res.status(500).json({ error: "Failed to create wallet" });
  }
});

// Update wallet
router.put("/:id", async (req, res) => {
  try {
    const db = await getDB();
    const { name, type, balance, icon, color } = req.body;

    const wallet = db
      .prepare(
        `
      SELECT * FROM wallets WHERE id = ? AND user_id = ?
    `,
      )
      .get(req.params.id, req.user.id);

    if (!wallet) {
      return res.status(404).json({ error: "Wallet not found" });
    }

    db.prepare(
      `
      UPDATE wallets 
      SET name = COALESCE(?, name),
          type = COALESCE(?, type),
          balance = COALESCE(?, balance),
          icon = COALESCE(?, icon),
          color = COALESCE(?, color)
      WHERE id = ? AND user_id = ?
    `,
    ).run(name, type, balance, icon, color, req.params.id, req.user.id);

    const updatedWallet = db
      .prepare("SELECT * FROM wallets WHERE id = ?")
      .get(req.params.id);

    res.json(updatedWallet);
  } catch (error) {
    console.error("Update wallet error:", error);
    res.status(500).json({ error: "Failed to update wallet" });
  }
});

// Delete wallet
router.delete("/:id", async (req, res) => {
  try {
    const db = await getDB();
    const wallet = db
      .prepare(
        `
      SELECT * FROM wallets WHERE id = ? AND user_id = ?
    `,
      )
      .get(req.params.id, req.user.id);

    if (!wallet) {
      return res.status(404).json({ error: "Wallet not found" });
    }

    db.prepare("DELETE FROM wallets WHERE id = ? AND user_id = ?").run(
      req.params.id,
      req.user.id,
    );

    res.json({ message: "Wallet deleted successfully" });
  } catch (error) {
    console.error("Delete wallet error:", error);
    res.status(500).json({ error: "Failed to delete wallet" });
  }
});

// Transfer between wallets
router.post("/transfer", async (req, res) => {
  try {
    const db = await getDB();
    const { fromWalletId, toWalletId, amount } = req.body;

    if (!fromWalletId || !toWalletId || !amount) {
      return res
        .status(400)
        .json({ error: "fromWalletId, toWalletId, and amount are required" });
    }

    if (amount <= 0) {
      return res.status(400).json({ error: "Amount must be positive" });
    }

    const fromWallet = db
      .prepare("SELECT * FROM wallets WHERE id = ? AND user_id = ?")
      .get(fromWalletId, req.user.id);
    const toWallet = db
      .prepare("SELECT * FROM wallets WHERE id = ? AND user_id = ?")
      .get(toWalletId, req.user.id);

    if (!fromWallet || !toWallet) {
      return res.status(404).json({ error: "Wallet not found" });
    }

    if (fromWallet.balance < amount) {
      return res.status(400).json({ error: "Insufficient balance" });
    }

    // Perform transfer
    db.prepare("UPDATE wallets SET balance = balance - ? WHERE id = ?").run(
      amount,
      fromWalletId,
    );
    db.prepare("UPDATE wallets SET balance = balance + ? WHERE id = ?").run(
      amount,
      toWalletId,
    );

    res.json({ message: "Transfer successful" });
  } catch (error) {
    console.error("Transfer error:", error);
    res.status(500).json({ error: "Failed to transfer" });
  }
});

export default router;
