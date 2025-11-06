import express from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import User from "../models/User.js";

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

    // 🔍 Check if email already exists
    const existingUser = await User.findOne({ email });
    if (existingUser)
      return res.status(400).json({ message: "Email already registered!" });

    // 🔒 Hash password and pin
    const hashedPassword = await bcrypt.hash(password, 10);
    const hashedPin = await bcrypt.hash(transactionPin, 10);

    // 🎟 Generate random username for login
    const username = `V&V25${Math.floor(100000 + Math.random() * 900000)}`;

    // 🆕 Create new user
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

    // 💡 Save the new user
    await newUser.save();

    // 🎁 If registered via referral → Notify referrer
    if (referralCode && referralName) {
      // Try to find the referrer user by username
      const referrer = await User.findOne({ username: referralCode });

      if (referrer) {
        const message = `🎉 ${name} has registered using your referral link!`;

        // Push notification to the referrer
        referrer.notifications.push({ message });

        // Optionally increment referral count/income tracking
        referrer.referralCount = (referrer.referralCount || 0) + 1;

        // Save referrer update
        await referrer.save();
      }
    }

    // ✅ Respond success
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

    // 🔍 Find user by username
    const user = await User.findOne({ username });
    if (!user) return res.status(400).json({ message: "User not found!" });

    // 🔒 Check password
    const match = await bcrypt.compare(password, user.password);
    if (!match)
      return res.status(400).json({ message: "Invalid credentials!" });

    // 🪪 Generate JWT token
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

// =============== RESET PASSWORD API ===============
router.post("/reset-password", async (req, res) => {
  try {
    const { username, newPassword } = req.body;

    // 🔍 Find user by username
    const user = await User.findOne({ username });
    if (!user) return res.status(404).json({ message: "User not found!" });

    // 🔒 Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;

    await user.save();

    res.json({ message: "Password reset successfully!" });
  } catch (err) {
    console.error("Reset Password Error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

export default router;
