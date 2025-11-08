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
  from: `"V&V Agro Support" <noreply@vandvagro.com>`,
  to: user.email,
  subject: "Reset Your Password | V&V.ai Learn & Earn Platform 🔐",
  html: `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
      <div style="max-width: 600px; margin: auto; border: 1px solid #eee; padding: 20px; border-radius: 10px;">
        <h2 style="color: #1a8917;">Dear ${user.name},</h2>
        <p>We received a request to reset the password for your V&V.ai Learn & Earn account.
To create a new password, please click the secure link below:</p>
        <p>👉 Reset Your Password</p>

        <div style="text-align: center; margin: 25px 0;">
          <a href="${resetLink}"
             style="background-color: #1a8917; color: #fff; padding: 12px 20px; text-decoration: none; border-radius: 6px; font-weight: bold;">
             This link will redirect you to our password reset page, where you can create a new password.
Please make sure your new password meets the following requirements:
          </a>
        </div>

        <p>For your safety, the reset link will automatically expire after<strong>10 minutes</strong>.</p>
        <p>Warm regards, <br>
           <strong>Team V&V.ai</strong>
           Learn. Earn. Grow.
           <a href="https://vandv.ai/">www.vandv.ai</a></p>
        <hr/>
        <p style="font-size: 12px; color: #999;">
          © ${new Date().getFullYear()} V&V Agro — All rights reserved.
        </p>
      </div>
    </div>
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
