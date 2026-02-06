import express from "express";
import getDB from "../config/database.js";
import { authenticateToken } from "../middleware/auth.js";

const router = express.Router();

// Apply auth middleware to all routes
router.use(authenticateToken);

// Get dashboard summary
router.get("/summary", async (req, res) => {
  try {
    const db = await getDB();
    const userId = req.user.id;
    const now = new Date();

    // Current month date range
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
      .toISOString()
      .split("T")[0];
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0)
      .toISOString()
      .split("T")[0];

    // Total balance across all wallets
    const totalBalance = db
      .prepare(
        `
      SELECT COALESCE(SUM(balance), 0) as total FROM wallets WHERE user_id = ?
    `,
      )
      .get(userId).total;

    // This month's income
    const monthlyIncome = db
      .prepare(
        `
      SELECT COALESCE(SUM(amount), 0) as total FROM transactions 
      WHERE user_id = ? AND type = 'income' AND date >= ? AND date <= ?
    `,
      )
      .get(userId, monthStart, monthEnd).total;

    // This month's expense
    const monthlyExpense = db
      .prepare(
        `
      SELECT COALESCE(SUM(amount), 0) as total FROM transactions 
      WHERE user_id = ? AND type = 'expense' AND date >= ? AND date <= ?
    `,
      )
      .get(userId, monthStart, monthEnd).total;

    // Spending by category (this month)
    const spendingByCategory = db
      .prepare(
        `
      SELECT c.id, c.name, c.icon, c.color, COALESCE(SUM(t.amount), 0) as total
      FROM categories c
      LEFT JOIN transactions t ON c.id = t.category_id 
        AND t.type = 'expense' 
        AND t.date >= ? AND t.date <= ?
        AND t.user_id = ?
      WHERE c.user_id = ? AND c.type = 'expense'
      GROUP BY c.id
      HAVING total > 0
      ORDER BY total DESC
    `,
      )
      .all(monthStart, monthEnd, userId, userId);

    // Income by category (this month)
    const incomeByCategory = db
      .prepare(
        `
      SELECT c.id, c.name, c.icon, c.color, COALESCE(SUM(t.amount), 0) as total
      FROM categories c
      LEFT JOIN transactions t ON c.id = t.category_id 
        AND t.type = 'income' 
        AND t.date >= ? AND t.date <= ?
        AND t.user_id = ?
      WHERE c.user_id = ? AND c.type = 'income'
      GROUP BY c.id
      HAVING total > 0
      ORDER BY total DESC
    `,
      )
      .all(monthStart, monthEnd, userId, userId);

    // Wallet balances
    const wallets = db
      .prepare(
        `
      SELECT id, name, type, balance, icon, color FROM wallets WHERE user_id = ?
    `,
      )
      .all(userId);

    // Recent transactions (last 10)
    const recentTransactions = db
      .prepare(
        `
      SELECT t.*, 
             w.name as wallet_name, w.icon as wallet_icon,
             c.name as category_name, c.icon as category_icon, c.color as category_color
      FROM transactions t
      LEFT JOIN wallets w ON t.wallet_id = w.id
      LEFT JOIN categories c ON t.category_id = c.id
      WHERE t.user_id = ?
      ORDER BY t.date DESC, t.created_at DESC
      LIMIT 10
    `,
      )
      .all(userId);

    // Daily spending trend (last 7 days)
    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      last7Days.push(date.toISOString().split("T")[0]);
    }

    const dailyTrend = last7Days.map((date) => {
      const dayData = db
        .prepare(
          `
        SELECT 
          COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) as income,
          COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) as expense
        FROM transactions
        WHERE user_id = ? AND date = ?
      `,
        )
        .get(userId, date);

      return {
        date,
        income: dayData.income,
        expense: dayData.expense,
      };
    });

    // Monthly trend (last 6 months)
    const monthlyTrend = [];
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const startDate = date.toISOString().split("T")[0];
      const endDate = new Date(date.getFullYear(), date.getMonth() + 1, 0)
        .toISOString()
        .split("T")[0];

      const monthData = db
        .prepare(
          `
        SELECT 
          COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) as income,
          COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) as expense
        FROM transactions
        WHERE user_id = ? AND date >= ? AND date <= ?
      `,
        )
        .get(userId, startDate, endDate);

      monthlyTrend.push({
        month: date.toLocaleDateString("id-ID", {
          month: "short",
          year: "numeric",
        }),
        income: monthData.income,
        expense: monthData.expense,
      });
    }

    res.json({
      totalBalance,
      monthlyIncome,
      monthlyExpense,
      monthlyNet: monthlyIncome - monthlyExpense,
      spendingByCategory,
      incomeByCategory,
      wallets,
      recentTransactions,
      dailyTrend,
      monthlyTrend,
    });
  } catch (error) {
    console.error("Dashboard error:", error);
    res.status(500).json({ error: "Failed to fetch dashboard data" });
  }
});

export default router;
