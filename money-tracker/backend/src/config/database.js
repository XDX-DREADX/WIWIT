import initSqlJs from "sql.js";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, "../../data/database.sqlite");

let db = null;
let SQL = null;

// Wrapper class to match better-sqlite3 API
class DatabaseWrapper {
  constructor(database) {
    this.database = database;
  }

  exec(sql) {
    this.database.run(sql);
    this.save();
  }

  run(sql, ...params) {
    this.database.run(sql, params);
    this.save();
    return { changes: this.database.getRowsModified() };
  }

  prepare(sql) {
    return new StatementWrapper(this, sql);
  }

  pragma(command) {
    this.database.run(`PRAGMA ${command}`);
  }

  save() {
    const data = this.database.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(dbPath, buffer);
  }
}

class StatementWrapper {
  constructor(wrapper, sql) {
    this.wrapper = wrapper;
    this.sql = sql;
  }

  run(...params) {
    this.wrapper.database.run(this.sql, params);
    this.wrapper.save();
    return {
      changes: this.wrapper.database.getRowsModified(),
      lastInsertRowid: this.getLastInsertRowId(),
    };
  }

  get(...params) {
    const stmt = this.wrapper.database.prepare(this.sql);
    stmt.bind(params);
    if (stmt.step()) {
      const row = stmt.getAsObject();
      stmt.free();
      return row;
    }
    stmt.free();
    return undefined;
  }

  all(...params) {
    const results = [];
    const stmt = this.wrapper.database.prepare(this.sql);
    stmt.bind(params);
    while (stmt.step()) {
      results.push(stmt.getAsObject());
    }
    stmt.free();
    return results;
  }

  getLastInsertRowId() {
    const result = this.wrapper.database.exec(
      "SELECT last_insert_rowid() as id",
    );
    return result[0]?.values[0]?.[0] || 0;
  }
}

// Initialize SQL.js and database
async function initDB() {
  SQL = await initSqlJs();

  // Load existing database or create new one
  if (fs.existsSync(dbPath)) {
    const buffer = fs.readFileSync(dbPath);
    db = new DatabaseWrapper(new SQL.Database(buffer));
  } else {
    db = new DatabaseWrapper(new SQL.Database());
  }

  // Enable foreign keys
  db.pragma("foreign_keys = ON");

  return db;
}

// Get database instance (initialize if needed)
export async function getDB() {
  if (!db) {
    await initDB();
  }
  return db;
}

// Initialize database tables
export async function initializeDatabase() {
  const database = await getDB();

  // Users table
  database.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      profile_photo TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Add profile_photo column if not exists (migration for existing databases)
  try {
    database.exec(`ALTER TABLE users ADD COLUMN profile_photo TEXT`);
  } catch (e) {
    // Column already exists, ignore error
  }

  // Wallets table
  database.exec(`
    CREATE TABLE IF NOT EXISTS wallets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('cash', 'bank', 'ewallet')),
      balance REAL DEFAULT 0,
      icon TEXT DEFAULT '💰',
      color TEXT DEFAULT '#6366f1',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // Categories table
  database.exec(`
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('income', 'expense')),
      icon TEXT DEFAULT '📁',
      color TEXT DEFAULT '#6366f1',
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // Transactions table
  database.exec(`
    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      wallet_id INTEGER NOT NULL,
      category_id INTEGER NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('income', 'expense')),
      amount REAL NOT NULL,
      description TEXT,
      date DATE NOT NULL,
      proof_image TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (wallet_id) REFERENCES wallets(id) ON DELETE CASCADE,
      FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
    )
  `);

  // Add proof_image column if not exists (migration)
  try {
    database.exec(`ALTER TABLE transactions ADD COLUMN proof_image TEXT`);
  } catch (e) {
    // Column already exists, ignore error
  }

  // Budgets table
  database.exec(`
    CREATE TABLE IF NOT EXISTS budgets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      category_id INTEGER NOT NULL,
      amount REAL NOT NULL,
      period TEXT NOT NULL CHECK(period IN ('monthly', 'weekly')),
      start_date DATE NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
    )
  `);

  console.log("✅ Database initialized successfully");
}

// Seed default categories for new users
export async function seedDefaultCategories(userId) {
  const database = await getDB();
  const defaultCategories = [
    // Income categories
    { name: "Gaji", type: "income", icon: "💼", color: "#22c55e" },
    { name: "Freelance", type: "income", icon: "💻", color: "#10b981" },
    { name: "Investasi", type: "income", icon: "📈", color: "#14b8a6" },
    { name: "Hadiah", type: "income", icon: "🎁", color: "#06b6d4" },
    { name: "Lainnya", type: "income", icon: "💵", color: "#0ea5e9" },
    // Expense categories
    { name: "Makanan", type: "expense", icon: "🍔", color: "#f43f5e" },
    { name: "Transportasi", type: "expense", icon: "🚗", color: "#ef4444" },
    { name: "Belanja", type: "expense", icon: "🛒", color: "#f97316" },
    { name: "Hiburan", type: "expense", icon: "🎮", color: "#f59e0b" },
    { name: "Tagihan", type: "expense", icon: "📄", color: "#eab308" },
    { name: "Kesehatan", type: "expense", icon: "💊", color: "#84cc16" },
    { name: "Pendidikan", type: "expense", icon: "📚", color: "#a855f7" },
    { name: "Lainnya", type: "expense", icon: "📦", color: "#ec4899" },
  ];

  const stmt = database.prepare(`
    INSERT INTO categories (user_id, name, type, icon, color)
    VALUES (?, ?, ?, ?, ?)
  `);

  for (const cat of defaultCategories) {
    stmt.run(userId, cat.name, cat.type, cat.icon, cat.color);
  }
}

// Seed default wallets for new users
export async function seedDefaultWallets(userId) {
  const database = await getDB();
  const defaultWallets = [
    { name: "Cash", type: "cash", icon: "💵", color: "#22c55e" },
    { name: "Bank BCA", type: "bank", icon: "🏦", color: "#3b82f6" },
    { name: "GoPay", type: "ewallet", icon: "📱", color: "#06b6d4" },
  ];

  const stmt = database.prepare(`
    INSERT INTO wallets (user_id, name, type, balance, icon, color)
    VALUES (?, ?, ?, 0, ?, ?)
  `);

  for (const wallet of defaultWallets) {
    stmt.run(userId, wallet.name, wallet.type, wallet.icon, wallet.color);
  }
}

export { getDB as default };
