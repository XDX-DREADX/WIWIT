import express from "express";
import bcrypt from "bcryptjs";
import getDB from "../config/database.js";
import { authenticateToken } from "../middleware/auth.js";

const router = express.Router();

// Apply auth middleware to all routes
router.use(authenticateToken);

// Get user profile
router.get("/", async (req, res) => {
  try {
    const db = await getDB();
    const user = db
      .prepare(
        "SELECT id, name, email, profile_photo, created_at FROM users WHERE id = ?",
      )
      .get(req.user.id);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json(user);
  } catch (error) {
    console.error("Get profile error:", error);
    res.status(500).json({ error: "Failed to fetch profile" });
  }
});

// Update user profile
router.put("/", async (req, res) => {
  try {
    const db = await getDB();
    const { name, email, photo } = req.body;

    // Check if email is already taken by another user
    if (email) {
      const existingUser = db
        .prepare("SELECT id FROM users WHERE email = ? AND id != ?")
        .get(email, req.user.id);

      if (existingUser) {
        return res.status(400).json({ error: "Email sudah digunakan" });
      }
    }

    // Update user
    db.prepare(
      `
      UPDATE users 
      SET name = COALESCE(?, name),
          email = COALESCE(?, email),
          profile_photo = COALESCE(?, profile_photo)
      WHERE id = ?
    `,
    ).run(name, email, photo, req.user.id);

    const updatedUser = db
      .prepare(
        "SELECT id, name, email, profile_photo, created_at FROM users WHERE id = ?",
      )
      .get(req.user.id);

    res.json(updatedUser);
  } catch (error) {
    console.error("Update profile error:", error);
    res.status(500).json({ error: "Failed to update profile" });
  }
});

// Change password
router.put("/password", async (req, res) => {
  try {
    const db = await getDB();
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res
        .status(400)
        .json({ error: "Current password and new password are required" });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: "Password minimal 6 karakter" });
    }

    // Get current user with password
    const user = db
      .prepare("SELECT password FROM users WHERE id = ?")
      .get(req.user.id);

    // Verify current password
    const isValidPassword = await bcrypt.compare(
      currentPassword,
      user.password,
    );
    if (!isValidPassword) {
      return res.status(400).json({ error: "Password saat ini salah" });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password
    db.prepare("UPDATE users SET password = ? WHERE id = ?").run(
      hashedPassword,
      req.user.id,
    );

    res.json({ message: "Password berhasil diubah" });
  } catch (error) {
    console.error("Change password error:", error);
    res.status(500).json({ error: "Failed to change password" });
  }
});

export default router;
