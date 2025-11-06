import express from "express";
import Profile from "../models/Profile.js";
import multer from "multer";
import path from "path";

const router = express.Router();

// 🔹 Image upload setup
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});
const upload = multer({ storage });

// ✅ Create or Update Profile
router.post("/", upload.single("profileImage"), async (req, res) => {
  try {
    const { memberName, gender, email, state, mobile, country, transactionPin, district } =
      req.body;

    const profileData = {
      memberName,
      gender,
      email,
      state,
      mobile,
      country,
      transactionPin,
      district,
      profileImage: req.file ? `/uploads/${req.file.filename}` : null,
    };

    const existing = await Profile.findOne({ email });

    if (existing) {
      await Profile.findOneAndUpdate({ email }, profileData);
      return res.json({ message: "Profile updated successfully!" });
    }

    const newProfile = new Profile(profileData);
    await newProfile.save();
    res.json({ message: "Profile created successfully!" });
  } catch (error) {
    console.error("Error saving profile:", error);
    res.status(500).json({ message: "Server Error" });
  }
});

// ✅ Get Profile by Email
router.get("/:email", async (req, res) => {
  try {
    const profile = await Profile.findOne({ email: req.params.email });
    if (!profile) return res.status(404).json({ message: "Profile not found" });
    res.json(profile);
  } catch (err) {
    res.status(500).json({ message: "Server Error" });
  }
});

export default router;
