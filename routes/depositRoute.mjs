// import express from "express";
// import User from "../models/Userdposit.mjs";

// const router = express.Router();

// // 💰 Deposit money to wallet
// router.post("/deposit", async (req, res) => {
//   try {
//     const { userId, amount } = req.body;

//     if (!userId || !amount) {
//       return res.status(400).json({ message: "User ID and amount are required." });
//     }

//     if (amount < 1000) {
//       return res.status(400).json({ message: "Minimum deposit is ₹1000." });
//     }

//     const user = await User.findById(userId);
//     if (!user) {
//       return res.status(404).json({ message: "User not found." });
//     }

//     user.walletBalance += amount;
//     user.totalDeposit += amount;
//     await user.save();

//     res.status(200).json({
//       message: `Deposit of ₹${amount} successful!`,
//       walletBalance: user.walletBalance,
//       totalDeposit: user.totalDeposit,
//     });
//   } catch (error) {
//     console.error("Deposit error:", error);
//     res.status(500).json({ message: "Server error. Please try again." });
//   }
// });

// export default router;





import express from "express";
import User from "../models/User.mjs"; // ensure path is correct

const router = express.Router();

router.post("/deposit", async (req, res) => {
  try {
    const { userId, amount } = req.body;

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    user.walletBalance += amount;
    user.totalDeposit += amount;
    await user.save();

    res.status(200).json({ message: "Deposit successful", user });
  } catch (error) {
    console.error("Deposit error:", error);
    res.status(500).json({ message: "Server error", error });
  }
});

export default router;
