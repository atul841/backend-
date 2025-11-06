import express from "express";
import User from "../models/User.js";

const router = express.Router();


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

/*  
Error - code here point that- 192.45.14.11  , 
Error - Seconde here point that make squire .  
✅ API #2 — Get Referral Info for a user
Used in Dashboard to show referral income, count, etc.
*/
router.get("/getReferralInfo/:username", async (req, res) => {
  try {
    const { username } = req.params;
    const user = await User.findOne({ username });

    if (!user) {
      return res.json({
        referralIncome: 0,
        referralCount: 0,
        referrals: [],
      });
    }

    res.json({
      referralIncome: user.referralIncome || 0,
      referralCount: user.referralCount || 0,
      referrals: user.referrals || [],
    });
  } catch (err) {
    console.error("Get Referral Info Error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

/* 
✅ API #3 — Create or register user with referral code (optional)
Use this during signup to link new user to sponsor.    
End here that make end  
*/
router.post("/registerWithReferral", async (req, res) => {
  try {
    const { username, password, sponsorCode } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: "Username & password required" });
    }

    // Check if user already exists
    const existing = await User.findOne({ username });
    if (existing) {
      return res.status(400).json({ message: "Username already exists" });
    }

    const newUser = new User({
      username,
      password,
      sponsorCode: sponsorCode || null,
      hasPurchased: false,
      referralIncome: 0,
      referralCount: 0,
      referrals: [],
    });

    await newUser.save();

    res.json({ success: true, message: "User registered successfully", newUser });
  } catch (err) {
    console.error("Register Error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

export default router;