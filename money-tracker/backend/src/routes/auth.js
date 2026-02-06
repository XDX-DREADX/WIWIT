import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import getDB, {
  seedDefaultCategories,
  seedDefaultWallets,
} from "../config/database.js";
import { authenticateToken } from "../middleware/auth.js";

const router = express.Router();

// Register new user
router.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const db = await getDB();

    // Validation
    if (!name || !email || !password) {
      return res
        .status(400)
        .json({ error: "Name, email, and password are required" });
    }

    if (password.length < 6) {
      return res
        .status(400)
        .json({ error: "Password must be at least 6 characters" });
    }

    // Check if email already exists
    const existingUser = db
      .prepare("SELECT id FROM users WHERE email = ?")
      .get(email);
    if (existingUser) {
      return res.status(400).json({ error: "Email already registered" });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert user
    const result = db
      .prepare(
        `
      INSERT INTO users (name, email, password) VALUES (?, ?, ?)
    `,
      )
      .run(name, email, hashedPassword);

    const userId = result.lastInsertRowid;

    // Seed default data for new user
    await seedDefaultCategories(userId);
    await seedDefaultWallets(userId);

    // Generate token
    const token = jwt.sign({ userId }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN,
    });

    res.status(201).json({
      message: "User registered successfully",
      token,
      user: { id: userId, name, email },
    });
  } catch (error) {
    console.error("Register error:", error);
    res.status(500).json({ error: "Server error during registration" });
  }
});

// Login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const db = await getDB();

    // Validation
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    // Find user
    const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email);
    if (!user) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    // Check password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    // Generate token
    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN,
    });

    res.json({
      message: "Login successful",
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        profile_photo: user.profile_photo,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Server error during login" });
  }
});

// Get current user
router.get("/me", authenticateToken, async (req, res) => {
  try {
    const db = await getDB();
    const user = db
      .prepare("SELECT id, name, email, profile_photo FROM users WHERE id = ?")
      .get(req.user.id);
    res.json({ user });
  } catch (error) {
    console.error("Get Me error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
