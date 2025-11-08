import express from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import nodemailer from "nodemailer";
import User from "../models/User.js";
import ResetToken from "../models/ResetToken.js"; // 🔹 new model

const router = express.Router();

// =============== REGISTER API ===============
router.post("/register", async (req, res) => {
  try {
    const {
      name,
      mobile,
      email,
      password,
      transactionPin,
      referralCode,
      referralName,
    } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser)
      return res.status(400).json({ message: "Email already registered!" });

    const hashedPassword = await bcrypt.hash(password, 10);
    const hashedPin = await bcrypt.hash(transactionPin, 10);

    const username = `V&V25${Math.floor(100000 + Math.random() * 900000)}`;

    const newUser = new User({
      name,
      mobile,
      email,
      username,
      password: hashedPassword,
      transactionPin: hashedPin,
      referralCode,
      referralName,
      hasPurchased: false,
      referralIncome: 0,
      referralCount: 0,
      referrals: [],
    });

    await newUser.save();

    if (referralCode && referralName) {
      const referrer = await User.findOne({ username: referralCode });
      if (referrer) {
        const message = `🎉 ${name} has registered using your referral link!`;
        referrer.notifications.push({ message });
        referrer.referralCount = (referrer.referralCount || 0) + 1;
        await referrer.save();
      }
    }

    res.status(201).json({
      message: "Registration successful! Please log in.",
      username,
    });
  } catch (err) {
    console.error("Registration Error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// =============== LOGIN API ===============
router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    const user = await User.findOne({ username });
    if (!user) return res.status(400).json({ message: "User not found!" });

    const match = await bcrypt.compare(password, user.password);
    if (!match)
      return res.status(400).json({ message: "Invalid credentials!" });

    const token = jwt.sign({ id: user._id }, "mySecretKey", { expiresIn: "7d" });

    res.json({
      message: "Login successful!",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        username: user.username,
        hasPurchased: user.hasPurchased || false,
        notifications: user.notifications || [],
      },
    });
  } catch (err) {
    console.error("Login Error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// ===========================================================
// ✅ STEP 1: REQUEST PASSWORD RESET (send email with link)
// ===========================================================
router.post("/request-password-reset", async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user)
      return res.status(400).json({ message: "No user found with this email" });

    const token = crypto.randomBytes(32).toString("hex");
    await ResetToken.create({ userId: user._id, token });

    const resetLink = `${process.env.FRONTEND_URL}/reset-password/${token}`;

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    await transporter.sendMail({
      from: `"VandV Agro" <${process.env.EMAIL_USER}>`,
      to: user.email,
      subject: "Password Reset Request",
      html: `
        <p>Hello ${user.name},</p>
        <p>You requested to reset your password.</p>
        <p>Click <a href="${resetLink}">here</a> to set a new password.</p>
        <p>This link will expire in 10 minutes.</p>
      `,
    });

    res.json({ message: "Password reset link sent to your email!" });
  } catch (error) {
    console.error("Request Password Reset Error:", error);
    res.status(500).json({ message: "Failed to send reset email!" });
  }
});

// ===========================================================
// ✅ STEP 2: RESET PASSWORD (after clicking email link)
// ===========================================================
router.post("/reset-password", async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    const tokenDoc = await ResetToken.findOne({ token });
    if (!tokenDoc)
      return res.status(400).json({ message: "Invalid or expired token" });

    const user = await User.findById(tokenDoc.userId);
    if (!user) return res.status(400).json({ message: "User not found" });

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    await user.save();

    await ResetToken.deleteOne({ token });

    res.json({ message: "Password reset successful!" });
  } catch (err) {
    console.error("Reset Password Error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

export default router;
