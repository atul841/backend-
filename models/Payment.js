import mongoose from "mongoose";

const paymentSchema = new mongoose.Schema({
  username: { type: String, required: true },
  planName: { type: String, required: true },
  orderId: { type: String, required: true },
  amount: { type: Number, required: true },
  gst: { type: Number, required: true },
  totalAmount: { type: Number, required: true },
  referralCode: { type: String, default: "" },
  referralName: { type: String, default: "" },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model("Payment", paymentSchema);
