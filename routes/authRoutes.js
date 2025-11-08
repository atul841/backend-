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
  from: `"V&V.ai Support" <donotreply@vandv.ai>`,
  to: user.email,
  subject: "Reset Your Password | V&V.ai Learn & Earn Platform 🔐",
  html: `
  <div style="font-family: Arial, sans-serif; background-color: #f9f9f9; padding: 30px;">
    <div style="max-width: 650px; background: #ffffff; margin: auto; border-radius: 10px; padding: 25px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
      <h2 style="color: #1a8917; text-align: center;">🔐 Reset Your Password</h2>
      <p>Dear <strong>${user.name}</strong>,</p>
      <p>We received a request to reset the password for your <strong>V&V.ai Learn & Earn</strong> account.</p>
      <p>To create a new password, please click the secure link below:</p>

      <div style="text-align: center; margin: 25px 0;">
        <a href="${resetLink}" style="background-color: #1a8917; color: #fff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: bold;">👉 Reset Your Password</a>
      </div>

      <p>This link will redirect you to our password reset page, where you can create a new password.</p>
      <p><strong>Please ensure your new password meets the following requirements:</strong></p>
      <ul style="margin-left: 20px;">
        <li>Minimum <strong>6 characters</strong></li>
        <li>At least one <strong>special character</strong> (e.g., !, @, #, $, %)</li>
      </ul>

      <p>Once your password has been updated, you can log in to your account here:</p>
      <p><a href="https://vandv.ai/login" style="color: #1a8917; text-decoration: none; font-weight: bold;">🔗 Login to Your Account</a></p>

      <hr style="margin: 25px 0; border: 0; border-top: 1px solid #ddd;" />

      <h3 style="color: #ff9800;">⚠️ Important Security Note:</h3>
      <ul style="margin-left: 20px;">
        <li><strong>For your safety</strong>, the reset link will automatically expire after <strong>10 minutes</strong>.</li>
        <li><strong>Do not share</strong> this reset link with anyone.</li>
        <li>This email contains sensitive information — please keep it private and secure.</li>
      </ul>

      <p style="font-size: 12px; color: #777;">
        <strong>Note:</strong> This is an automated message from <strong>donotreply@vandv.ai</strong>.<br/>
        Please do not reply to this email.
      </p>

      <p style="margin-top: 25px; font-size: 14px; color: #333;">
        Warm regards,<br/>
        <strong>Team V&V.ai</strong><br/>
        <em>Learn. Earn. Grow.</em><br/>
        <a href="https://www.vandv.ai" style="color: #1a8917; text-decoration: none;">www.vandv.ai</a>
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
