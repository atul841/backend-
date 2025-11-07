// import express from "express";
// import mongoose from "mongoose";
// import cors from "cors";
// import dotenv from "dotenv";

// 🟢 Import all route files
// import authRoutes from "./routes/authRoutes.js";
// import paymentRoutes from "./routes/payment.js";
// import profileRoutes from "./routes/profileRoutes.js";
// import kycRoutes from "./routes/kycRoutes.js";
// import rewardRoutes from "./routes/reward.js";
// import referralRoutes from "./routes/referralRoutes.js";

// dotenv.config();

// const app = express();

// // ✅ Middlewares
// app.use(express.json());
// app.use(cors({
//   origin: "*", // 👉 Optional: specify your frontend URL for security e.g. "http://localhost:3000"
//   methods: ["GET", "POST", "PUT", "DELETE"],
// }));

// // ✅ API Routes
// app.use("/api/auth", authRoutes);       // 🧩 Auth routes
// app.use("/api/payment", paymentRoutes); // 💳 Payment
// app.use("/api/profile", profileRoutes); // 👤 Profile
// app.use("/api/kyc", kycRoutes);         // 🪪 KYC
// app.use("/api/reward", rewardRoutes);   // 🏆 Rewards
// app.use("/api/referral", referralRoutes); // 👥 Referral

// // ✅ MongoDB Connection
// mongoose
//   .connect(process.env.MONGO_URI || "mongodb://127.0.0.1:27017/profileDatabase", {
//     useNewUrlParser: true,
//     useUnifiedTopology: true,
//   })
//   .then(() => console.log("✅ MongoDB Connected Successfully"))
//   .catch((err) => console.error("❌ MongoDB Connection Failed:", err.message));

// // ✅ Default Route
// app.get("/", (req, res) => {
//   res.status(200).send("🚀 AgriPreneur API Server Running Successfully!");
// });

// // ✅ Error Handling Middleware
// app.use((err, req, res, next) => {
//   console.error("🔥 Server Error:", err);
//   res.status(500).json({ message: "Internal Server Error", error: err.message });
// });

// // ✅ Start Server
// const PORT = process.env.PORT || 5000;
// app.listen(PORT, () => console.log(`🚀 Server is live on port ${PORT}`));
  
// ✅ Full Fixed Backend Code (Socket.IO 404 issue solved)





import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import bodyParser from "body-parser";
import mongoose from "mongoose";
import axios from "axios";
import dotenv from "dotenv";

// 🟢 Import route files
import authRoutes from "./routes/authRoutes.js";
import paymentRoutes from "./routes/payment.js";
import profileRoutes from "./routes/profileRoutes.js";
import kycRoutes from "./routes/kycRoutes.js";
import rewardRoutes from "./routes/reward.js";
import referralRoutes from "./routes/referralRoutes.js";
import depositRoute from "./routes/depositRoute.mjs";

dotenv.config();

const app = express();
const server = http.createServer(app);

// ✅ Socket.io with correct CORS (React frontend runs on port 5173)
const io = new Server(server, {
  cors: {
    origin: ["http://localhost:5173",'https://vandvagro.vandvagro.com','http://vandvagro.vandvagro.com'], // ✅ Frontend URL
    methods: ["GET", "POST", "PUT", "DELETE"],
  },
});

// ✅ Middlewares
app.use(cors({
  origin: ["http://localhost:5173",'https://vandvagro.vandvagro.com','http://vandvagro.vandvagro.com'],
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true,
}));

app.use(bodyParser.json());
app.use(express.json());

// ✅ Connect MongoDB
// Deposit conection 




mongoose
  .connect(
    process.env.MONGO_URI ||
      process.env.MONGODB_URI ||
      "mongodb://127.0.0.1:27017/profileDatabase",
    {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    }
  )
  .then(() => console.log("✅ MongoDB Connected Successfully"))
  .catch((err) => console.error("❌ MongoDB Connection Failed:", err.message));

// ✅ Main API Routes
app.use("/api/auth", authRoutes);
app.use("/api/payment", paymentRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/kyc", kycRoutes);
app.use("/api/reward", rewardRoutes);
app.use("/api/referral", referralRoutes);

app.use("/api", depositRoute);

// ✅ Default route
app.get("/", (req, res) => {
  res.status(200).send("🚀 AgriPreneur API Server Running Successfully!");
});

// =====================================================================
// 🟢 WITHDRAWAL SYSTEM
// =====================================================================

const withdrawalSchema = new mongoose.Schema({
  amount: Number,
  tds: Number,
  payable: Number,
  status: { type: String, default: "requested" },
  transactionId: String,
  createdAt: { type: Date, default: Date.now },
  paidAt: { type: Date },
});

const walletSchema = new mongoose.Schema({
  balance: { type: Number, default: 50000 },
});

const Wallet = mongoose.model("Wallet", walletSchema);
const Withdrawal = mongoose.model("Withdrawal", withdrawalSchema);

async function getWallet() {
  let wallet = await Wallet.findOne();
  if (!wallet) wallet = await Wallet.create({ balance: 50000 });
  return wallet;
}

// ✅ BALANCE endpoint
app.get("/balance", async (req, res) => {
  const wallet = await getWallet();
  res.json({ balance: wallet.balance });
});

// ✅ Get all withdrawals
app.get("/withdrawals", async (req, res) => {
  const data = await Withdrawal.find().sort({ createdAt: -1 });
  res.json({ withdrawals: data });
});

// ✅ Create withdrawal request
app.post("/withdraw", async (req, res) => {
  try {
    const amount = Number(req.body.amount);
    if (!amount || amount < 10000)
      return res.status(400).json({ message: "Minimum ₹10,000 required" });

    const wallet = await getWallet();
    if (amount > wallet.balance)
      return res.status(400).json({ message: "Insufficient balance" });

    const tds = (amount * 5) / 100;
    const payable = amount - tds;

    const withdrawal = await Withdrawal.create({
      amount,
      tds,
      payable,
      status: "requested",
    });

    wallet.balance = Number((wallet.balance - amount).toFixed(2));
    await wallet.save();

    io.emit("balanceUpdate", { balance: wallet.balance });
    io.emit("withdrawalUpdate", withdrawal);

    res.json({ success: true, withdrawal });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// ✅ Cashfree helper
async function sendToBank({ name, account, ifsc, amount }) {
  const CF_CLIENT_ID = process.env.CF_CLIENT_ID;
  const CF_CLIENT_SECRET = process.env.CF_CLIENT_SECRET;

  if (!CF_CLIENT_ID || !CF_CLIENT_SECRET) {
    throw new Error("Missing Cashfree credentials in .env");
  }

  try {
    const tokenRes = await axios.post(
      "https://payout-gamma.cashfree.com/payout/v1/authorize",
      {},
      {
        headers: {
          "X-Client-Id": CF_CLIENT_ID,
          "X-Client-Secret": CF_CLIENT_SECRET,
        },
      }
    );

    const token = tokenRes.data?.data?.token;
    if (!token) throw new Error("Token not found in Cashfree response");

    const transferRes = await axios.post(
      "https://payout-gamma.cashfree.com/payout/v1/transfers",
      {
        beneId: `bene_${Date.now()}`,
        amount,
        transferId: `txn_${Date.now()}`,
        transferMode: "banktransfer",
        remarks: "Withdrawal Payout",
        beneDetails: {
          name,
          bankAccount: account,
          ifsc,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );

    console.log("✅ Cashfree Response:", transferRes.data);
    return transferRes.data;
  } catch (err) {
    console.error("❌ Cashfree API Error:", err.response?.data || err.message);
    throw new Error("Cashfree payout failed, check credentials or endpoints");
  }
}

// ✅ Approve & send withdrawal
app.put("/withdraw/approve/:id", async (req, res) => {
  try {
    const withdrawal = await Withdrawal.findById(req.params.id);
    if (!withdrawal)
      return res.status(404).json({ message: "Withdrawal not found" });

    if (withdrawal.status === "paid")
      return res.status(400).json({ message: "Already processed" });

    const userBank = {
      name: "Rahul Sharma",
      account: "123456789012",
      ifsc: "HDFC0001234",
    };

    const payout = await sendToBank({
      name: userBank.name,
      account: userBank.account,
      ifsc: userBank.ifsc,
      amount: withdrawal.payable,
    });

    withdrawal.status = "paid";
    withdrawal.transactionId =
      payout.data?.transfer?.transferId || `txn_${Date.now()}`;
    withdrawal.paidAt = new Date();
    await withdrawal.save();

    io.emit("withdrawalPaid", withdrawal);
    res.json({ success: true, withdrawal });
  } catch (err) {
    console.error("Approve Error:", err.message);
    res.status(500).json({ message: "Failed to process payout" });
  }
});

// ✅ SOCKET.IO connection
io.on("connection", (socket) => {
  console.log("🟢 Socket connected:", socket.id);

  socket.on("disconnect", () => {
    console.log("🔴 Socket disconnected:", socket.id);
  });
});

// ✅ Error handler
app.use((err, req, res, next) => {
  console.error("🔥 Server Error:", err);
  res
    .status(500)
    .json({ message: "Internal Server Error", error: err.message });
});
 // 
// ✅ Start main server
// ✅ Start Server
 const PORT = process.env.PORT || 5000;
 app.listen(PORT, () => console.log(`🚀 Server is live on port ${PORT}`));
