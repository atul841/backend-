import express from "express";
import User from "../models/User.js";

const router = express.Router();

/**
 * ✅ This API adds ₹2000 to referrer's income
 * Called when a referred user completes their first video or task.
 * Body should include { username }
 */
router.post("/addReferralIncome", async (req, res) => {
  try {
    const { username } = req.body; // username of the user who watched video
    if (!username)
      return res.status(400).json({ message: "Username is required!" });

    // 🔹 Find the user who just earned points
    const user = await User.findOne({ username });
    if (!user)
      return res.status(404).json({ message: "User not found!" });

    // 🔹 Check if user has a referrer
    if (!user.referralCode) {
      return res.status(400).json({ message: "No referrer found for this user." });
    }

    // 🔹 Find the referrer (the one who gave referralCode)
    const referrer = await User.findOne({ username: user.referralCode });
    if (!referrer) {
      return res.status(404).json({ message: "Referrer not found!" });
    }

    // 🔹 Increase referrer’s income (just for backend record)
    if (!referrer.referralIncome) referrer.referralIncome = 0;
    referrer.referralIncome += 2000;

    await referrer.save();

    return res.json({
      message: `₹2000 added to ${referrer.username}'s referral income.`,
      referrer: referrer.username,
      newReferralIncome: referrer.referralIncome,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error", error: err.message });
  }
});

export default router;
