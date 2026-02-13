import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

import { initializeDatabase } from "./config/database.js";
import authRoutes from "./routes/auth.js";
import walletsRoutes from "./routes/wallets.js";
import categoriesRoutes from "./routes/categories.js";
import transactionsRoutes from "./routes/transactions.js";
import budgetsRoutes from "./routes/budgets.js";
import dashboardRoutes from "./routes/dashboard.js";
import reportsRoutes from "./routes/reports.js";
import profileRoutes from "./routes/profile.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Ensure data directory exists
const dataDir = path.join(__dirname, "../data");
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Initialize database (async)
await initializeDatabase();

// Middleware
app.use(cors());
app.use(express.json({ limit: "10mb" })); // Increased for photo uploads

// Request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/wallets", walletsRoutes);
app.use("/api/categories", categoriesRoutes);
app.use("/api/transactions", transactionsRoutes);
app.use("/api/budgets", budgetsRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/reports", reportsRoutes);
app.use("/api/profile", profileRoutes);

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Serve frontend static files in production
const frontendDist = path.join(__dirname, "../../frontend/dist");
if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist));

  // SPA fallback - serve index.html for all non-API routes
  app.get("*", (req, res) => {
    if (!req.path.startsWith("/api")) {
      res.sendFile(path.join(frontendDist, "index.html"));
    }
  });
  console.log("📦 Serving frontend from:", frontendDist);
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("Error:", err);
  res.status(500).json({ error: "Internal server error" });
});

// Start server
app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════╗
║     💰 Money Tracker API Server Started!       ║
╠════════════════════════════════════════════════╣
║  Server running at: http://localhost:${PORT}      ║
║  Press Ctrl+C to stop                          ║
╚════════════════════════════════════════════════╝
  `);
});
