import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    message: { type: String, required: true },
    read: { type: Boolean, default: false },
    date: { type: Date, default: Date.now },
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {  
    // 🧍 Basic User Info
    name: { type: String, required: true },
    mobile: { type: String, required: true },
    email: { type: String, required: true, unique: true },

    // 🔑 Login Credentials
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    transactionPin: { type: String, required: true },

    // 🎁 Referral System
    referralCode: { type: String }, // Code user used during signup
    referralName: { type: String }, // Who referred this user
    referralIncome: { type: Number, default: 0 }, // Total income from referrals

    // 🔔 Notifications (new)
    notifications: [notificationSchema],
  },
  { timestamps: true }
);

// ✅ Export the model
export default mongoose.model("User", userSchema);
