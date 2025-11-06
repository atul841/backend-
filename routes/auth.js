// ===== LOGIN BACKEND =====
import express from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import User from "../models/User.js"; // same model as registration

const router = express.Router();

// POST /api/login
router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    const user = await User.findOne({ username });
    if (!user) {
      return res.status(400).json({ message: "User not found!" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid password!" });
    }

    const token = jwt.sign({ id: user._id }, "yourSecretKey", { expiresIn: "7d" });

    res.json({
      message: `Welcome back, ${user.name}!`,
      token,
    });
  } catch (err) {
    res.status(500).json({ message: "Login failed!", error: err.message });
  }
});

export default router;
