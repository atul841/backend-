import mongoose from "mongoose";

const KycSchema = new mongoose.Schema({
  memberId: { type: String, required: true },
  memberName: String,
  accountHolder: String,
  accountNumber: String,
  ifsc: String,
  bankName: String,
  branchName: String,
  panNo: String,
  panImage: String,
  aadharNo: String,
  aadhaarFront: String,
  aadhaarBack: String,
  transactionPin: String,
  status: { type: String, default: "Pending" },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model("Kyc", KycSchema);
    