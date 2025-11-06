import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import Kyc from "../models/Kyc.js";

const router = express.Router();

// Ensure uploads folder exists
const uploadDir = "uploads";
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

// Multer storage setup
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const name = `${file.fieldname}-${Date.now()}${ext}`;
    cb(null, name);
  },
});
const upload = multer({ storage });

// ✅ POST /api/kyc — Save KYC data
router.post(
  "/",
  upload.fields([
    { name: "panImage", maxCount: 1 },
    { name: "aadhaarFront", maxCount: 1 },
    { name: "aadhaarBack", maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      const body = req.body;
      if (!body.memberId) {
        return res.status(400).json({ message: "memberId is required" });
      }

      // 🔒 Check if already submitted
      const existing = await Kyc.findOne({ memberId: body.memberId });
      if (existing) {
        return res
          .status(400)
          .json({ message: "You have already submitted your KYC details." });
      }

      const doc = {
        memberId: body.memberId,
        memberName: body.memberName || "",
        accountHolder: body.accountHolder || "",
        accountNumber: body.accountNumber || "",
        ifsc: body.ifsc || "",
        bankName: body.bankName || "",
        branchName: body.branchName || "",
        panNo: body.panNo || "",
        aadharNo: body.aadhaarNo || "",
        transactionPin: body.transactionPin || "",
        status: "Pending",
      };

      if (req.files) {
        if (req.files.panImage?.[0])
          doc.panImage = `/uploads/${req.files.panImage[0].filename}`;
        if (req.files.aadhaarFront?.[0])
          doc.aadhaarFront = `/uploads/${req.files.aadhaarFront[0].filename}`;
        if (req.files.aadhaarBack?.[0])
          doc.aadhaarBack = `/uploads/${req.files.aadhaarBack[0].filename}`;
      }

      const kyc = new Kyc(doc);
      await kyc.save();
      return res.json({ message: "KYC saved", kyc });
    } catch (err) {
      console.error("Error saving KYC:", err);
      return res.status(500).json({ message: "Server error" });
    }
  }
);

// ✅ GET /api/kyc — Filter by memberId, fromDate, toDate
router.get("/", async (req, res) => {
  try {
    const { memberId, fromDate, toDate } = req.query;
    const filter = {};

    if (memberId) filter.memberId = memberId;
    if (fromDate || toDate) {
      filter.createdAt = {};
      if (fromDate) filter.createdAt.$gte = new Date(fromDate + "T00:00:00.000Z");
      if (toDate) filter.createdAt.$lte = new Date(toDate + "T23:59:59.999Z");
    }

    const kycs = await Kyc.find(filter).sort({ createdAt: -1 }).lean();
    const host = req.get("host");
    const protocol = req.protocol;

    const result = kycs.map((k) => ({
      ...k,
      panImage: k.panImage ? `${protocol}://${host}${k.panImage}` : null,
      aadhaarFront: k.aadhaarFront
        ? `${protocol}://${host}${k.aadhaarFront}`
        : null,
      aadhaarBack: k.aadhaarBack
        ? `${protocol}://${host}${k.aadhaarBack}`
        : null,
    }));

    return res.json(result);
  } catch (err) {
    console.error("Error fetching KYC:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

// ✅ CHECK if KYC exists
router.get("/check/:memberId", async (req, res) => {
  try {
    const existing = await Kyc.findOne({ memberId: req.params.memberId });
    res.json({ exists: !!existing });
  } catch (err) {
    console.error("Error checking KYC:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// ✅ NEW: Fetch full KYC details for a user (to prefill form on login)
router.get("/get/:memberId", async (req, res) => {
  try {
    const kyc = await Kyc.findOne({ memberId: req.params.memberId }).lean();
    if (!kyc) return res.status(404).json({ message: "KYC not found" });

    const host = req.get("host");
    const protocol = req.protocol;
    const updated = {
      ...kyc,
      panImage: kyc.panImage ? `${protocol}://${host}${kyc.panImage}` : null,
      aadhaarFront: kyc.aadhaarFront
        ? `${protocol}://${host}${kyc.aadhaarFront}`
        : null,
      aadhaarBack: kyc.aadhaarBack
        ? `${protocol}://${host}${kyc.aadhaarBack}`
        : null,
    };

    res.json(updated);
  } catch (err) {
    console.error("Error fetching KYC details:", err);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;
