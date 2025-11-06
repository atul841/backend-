import mongoose from "mongoose";

const vvPaymentDB = mongoose.createConnection("mongodb://localhost:27017/vv_payment");

const userSchema = new mongoose.Schema({
  name: String,
  email: String,
  password: String,
  walletBalance: { type: Number, default: 0 },
  totalDeposit: { type: Number, default: 0 },
});

export default mongoose.models.UserDeposit || mongoose.model("UserDeposit", userSchema);
