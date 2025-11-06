import mongoose from "mongoose";

const profileSchema = new mongoose.Schema({
  memberName: String,
  gender: String,
  email: String,
  state: String,
  mobile: String,
  profileImage: String, // 🔥 Image URL save karenge
  country: String,
  transactionPin: String,
  district: String,
});

export default mongoose.model("Profile", profileSchema);
