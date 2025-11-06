

import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import bodyParser from "body-parser";
import mongoose from "mongoose";
import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.use(cors());
app.use(bodyParser.json());

// ✅ MongoDB connection
const MONGO_URI = "mongodb://127.0.0.1:27017/withdrawalDB";
mongoose
  .connect(MONGO_URI)
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => console.error("❌ MongoDB error:", err));

// ✅ SCHEMAS
const withdrawalSchema = new mongoose.Schema({
  amount: Number,
  tds: Number,
  payable: Number,
  status: { type: String, default: "requested" }, // requested | paid | rejected
  transactionId: String,
  createdAt: { type: Date, default: Date.now },
  paidAt: { type: Date },
});

const walletSchema = new mongoose.Schema({
  balance: { type: Number, default: 50000 },
});

const Wallet = mongoose.model("Wallet", walletSchema);
const Withdrawal = mongoose.model("Withdrawal", withdrawalSchema);

// ✅ Ensure wallet exists
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

// ✅ Cashfree helper function (Latest working version)
async function sendToBank({ name, account, ifsc, amount }) {
  const CF_CLIENT_ID = process.env.CF_CLIENT_ID;
  const CF_CLIENT_SECRET = process.env.CF_CLIENT_SECRET;

  if (!CF_CLIENT_ID || !CF_CLIENT_SECRET) {
    throw new Error("Missing Cashfree credentials in .env");
  }

  try {
    // Step 1: Get auth token
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

    console.log("🔑 Auth Response:", tokenRes.data);

    const token = tokenRes.data?.data?.token;
    if (!token) throw new Error("Token not found in Cashfree response");

    // Step 2: Initiate transfer (sandbox)
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

    if (withdrawal.status === "paid") {
      return res.status(400).json({ message: "Already processed" });
    }

    // Example user bank (in real app, fetch from user DB)
    const userBank = {
      name: "Rahul Sharma",
      account: "123456789012",
      ifsc: "HDFC0001234",
    };

    // Send payout
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

// ✅ SOCKET
io.on("connection", async (socket) => {
  console.log("🟢 Client connected:", socket.id);
  const wallet = await getWallet();
  socket.emit("balanceUpdate", { balance: wallet.balance });
});

// ✅ Start server
const PORT = 4000;
server.listen(PORT, () =>
  console.log(`🚀 Server running on http://localhost:${PORT}`)
);

