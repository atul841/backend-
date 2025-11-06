// import mongoose from 'mongoose';

// const userSchema = new mongoose.Schema({
//   name: String,
//   email: { type: String, unique: true },
//   referralCode: { type: String, unique: true },
//   referrer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
//   referralCount: { type: Number, default: 0 },
//   balance: { type: Number, default: 0 },
//   points: { type: Number, default: 0 },
//   hasPurchased: { type: Boolean, default: false } // ✅ add this line
// });

// const User = mongoose.model('User', userSchema);
// export default User;




import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  referralCode: { type: String, unique: true },
  referrer: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  referralCount: { type: Number, default: 0 },
  balance: { type: Number, default: 0 },
  points: { type: Number, default: 0 },
  hasPurchased: { type: Boolean, default: false }, // ✅ Added field
});

// ✅ Prevent OverwriteModelError in ESM (type: module)
const User = mongoose.models.User || mongoose.model("User", userSchema);

export default User;
