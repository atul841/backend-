// import express from "express";
// import axios from "axios";
// import User from "../models/User.js"; // Add this import

// const router = express.Router();

// const appId =
//   process.env.CASHFREE_APP_ID || "1075632dceec307b87829b02dd22365701";
// const secretKey =
//   process.env.CASHFREE_SECRET_KEY ||
//   "cfsk_ma_prod_2da27761059da075dccc61d43bc9c810_7d1dfb21";
// const cashfreeEnv = process.env.CASHFREE_ENV || "sandbox";

// const cashfreeBaseUrl =
//   cashfreeEnv === "production"
//     ? "https://api.cashfree.com/pg"
//     : "https://sandbox.cashfree.com/pg";

// // ✅ Create Order Endpoint
// router.post("/create-order", async (req, res) => {
//   try {
//     const { amount, orderId, customerName, customerPhone, customerEmail } =
//       req.body;

//     if (!amount || !orderId) {
//       return res.status(400).json({ error: "Missing amount or orderId" });
//     }

//     const payload = {
//       order_id: orderId,
//       order_amount: Number(amount),
//       order_currency: "INR",
//       customer_details: {
//         customer_id: customerPhone || "CUST001",
//         customer_name: customerName || "Guest User",
//         customer_email: customerEmail || "test@example.com",
//         customer_phone: customerPhone || "9999999999",
//       },
//       order_meta: {
//         return_url: "http://localhost:5173/payment/success?order_id={order_id}",
//         notify_url: "http://localhost:5000/api/payment/notify",
//       },
//     };

//     const cashfreeRes = await axios.post(`${cashfreeBaseUrl}/orders`, payload, {
//       headers: {
//         "x-client-id": appId,
//         "x-client-secret": secretKey,
//         "x-api-version": "2022-09-01",
//         "Content-Type": "application/json",
//       },
//     });

//     console.log("✅ Cashfree Response:", cashfreeRes.data);

//     if (!cashfreeRes.data?.payment_session_id) {
//       return res.status(400).json({
//         error: "Invalid Cashfree response",
//         details: cashfreeRes.data,
//       });
//     }

//     res.json({
//       paymentSessionId: cashfreeRes.data.payment_session_id,
//       orderId: cashfreeRes.data.order_id,
//     });
//   } catch (error) {
//     console.error("❌ Cashfree Error:", error.response?.data || error.message);
//     res.status(500).json({
//       error: "Could not create payment order",
//       details: error.response?.data || error.message,
//     });
//   }
// });

// // ✅ Check Purchase Status
// router.get("/check-purchase/:username", async (req, res) => {
//   try {
//     const { username } = req.params;
//     const user = await User.findOne({ username });

//     if (!user) {
//       return res.status(404).json({ hasPurchased: false });
//     }

//     res.json({ hasPurchased: user.hasPurchased || false });
//   } catch (err) {
//     console.error("❌ Error checking purchase:", err.message);
//     res.status(500).json({ error: "Error checking purchase status" });
//   }
// });

// // ✅ Mark Purchase as Done (Call after payment success)
// router.post("/mark-purchase/:username", async (req, res) => {
//   try {
//     const { username } = req.params;
//     const user = await User.findOne({ username });

//     if (!user) {
//       return res.status(404).json({ error: "User not found" });
//     }

//     // Mark purchase
//     user.hasPurchased = true;
//     await user.save();

//     // If user has referralCode, add income to referrer
//     if (user.referralCode) {
//       const referrer = await User.findOne({ username: user.referralCode });
//       if (referrer) {
//         referrer.referralIncome = (referrer.referralIncome || 0) + 2000;
//         referrer.referralCount = (referrer.referralCount || 0) + 1;
//         if (!referrer.referrals.includes(username)) {
//           referrer.referrals.push(username);
//         }
//         await referrer.save();
//         console.log(`💸 ₹2000 added to referrer ${referrer.username}`);
//       }
//     }

//     res.json({ success: true, message: "Purchase marked successfully" });
//   } catch (err) {
//     console.error("❌ Error marking purchase:", err.message);
//     res.status(500).json({ error: "Error marking purchase" });
//   }
// });

// // ✅ Add Referral Income (Placeholder, now proper for purchase if needed)
// router.post("/addReferralIncome", async (req, res) => {
//   try {
//     const { sponsorUsername } = req.body;

//     if (!sponsorUsername) {
//       return res.status(400).json({ error: "Missing sponsor username" });
//     }

//     const referrer = await User.findOne({ username: sponsorUsername });
//     if (!referrer) {
//       return res.status(404).json({ error: "Referrer not found" });
//     }

//     referrer.referralIncome = (referrer.referralIncome || 0) + 2000;
//     await referrer.save();

//     console.log(`💸 Referral income credited to sponsor: ${sponsorUsername}`);

//     res.json({
//       success: true,
//       message: `Referral income added successfully for ${sponsorUsername}`,
//     });
//   } catch (error) {
//     console.error("❌ Referral income error:", error.message);
//     res.status(500).json({ error: "Failed to add referral income" });
//   }
// });

// export default router;

import express from "express";
import axios from "axios";
import User from "../models/User.js";
import dotenv from 'dotenv';
import { v4 as uuidv4 } from "uuid";
dotenv.config();

const router = express.Router();


const ENV = process.env.CASHFREE_ENV || "sandbox";
const CF_CLIENT_ID = process.env.CF_CLIENT_ID;
const CF_CLIENT_SECRET = process.env.CF_CLIENT_SECRET;
const APP_FRONTEND_URL =
  process.env.APP_FRONTEND_URL || "https://vandvagro.vandvagro.com";
const APP_BACKEND_URL = process.env.APP_BACKEND_URL || "https://api.vandvagro.com";

const CASHFREE_BASE =
  ENV === "live"
    ? "https://api.cashfree.com/pg"
    : "https://sandbox.cashfree.com/pg";

function log(...args) {
  console.log(...args);
}


router.post("/create-order", async (req, res) => {
  try {
    const { amount, customerName, customerPhone, customerEmail, username } =
      req.body;

    if (!amount) return res.status(400).json({ error: "Missing amount" });

    // Use provided orderId or generate unique one
    // const orderId = req.body.orderId || `ORD_${Date.now()}`;
    const orderId = `ORD_${uuidv4()}`;

    const payload = {
      order_id: orderId,
      order_amount: Number(amount),
      order_currency: "INR",
      customer_details: {
        customer_id: customerPhone || username || "CUST_001",
        customer_name: customerName || "Guest User",
        customer_email: customerEmail || "test@example.com",
        customer_phone: customerPhone || "9999999999",
      },
      order_meta: {
        // Cashfree requires {order_id} placeholder if you want it replaced in return_url
        return_url: `${APP_FRONTEND_URL}/payment-success?order_id={order_id}`,
        notify_url: `${APP_BACKEND_URL}/api/payment/notify`, // webhook
      },
    };

    const headers = {
      "x-client-id": CF_CLIENT_ID,
      "x-client-secret": CF_CLIENT_SECRET,
      "x-api-version": "2022-09-01",
      "Content-Type": "application/json",
      "x-request-id": `req_${Date.now()}`,
    };

    log("→ CASHFREE create-order: ENV:", ENV);
    log("→ Base URL:", CASHFREE_BASE + "/orders");
    log("→ Headers:", {
      "x-client-id": headers["x-client-id"],
      "x-client-secret": headers["x-client-secret"] ? "[LOADED]" : "[MISSING]",
    });
    log("→ Payload:", payload);

    const cfRes = await axios.post(`${CASHFREE_BASE}/orders`, payload, {
      headers,
    });

    log("← CASHFREE response status:", cfRes.status);
    log("← CASHFREE response data:", cfRes.data);

    const sessionId = cfRes.data?.payment_session_id;

    if (!sessionId) {
      log("❌ payment_session_id missing in Cashfree response:", cfRes.data);
      return res
        .status(400)
        .json({ error: "payment_session_id missing", details: cfRes.data });
    }

   
    res.json({
      success: true,
      environment: ENV,
      payment_session_id: sessionId,
      order_id: cfRes.data.order_id,
      cashfree: cfRes.data,
    });
  } catch (err) {
    log("❌ Cashfree create-order error:", err.response?.data || err.message);
    res
      .status(500)
      .json({ success: false, error: err.response?.data || err.message });
  }
});


router.post("/notify", async (req, res) => {
  try {
    log("→ /api/payment/notify received webhook:", req.body);

    
    const body = req.body || {};
    const orderId = body.order_id || body.orderId;
    const orderStatus = body.order_status || body.orderStatus || body.txStatus;
    const referenceId = body.reference_id || body.referenceId;
    const paymentMode = body.payment_mode;

    
    log("→ webhook parsed:", {
      orderId,
      orderStatus,
      referenceId,
      paymentMode,
    });

    
    res.status(200).json({ received: true });
  } catch (err) {
    log("❌ Error in notify webhook:", err.message);
    res.status(500).json({ error: "webhook processing failed" });
  }
});


router.post("/mark-purchase/:username", async (req, res) => {
  try {
    const { username } = req.params;
    if (!username)
      return res.status(400).json({ error: "Missing username param" });

    const user = await User.findOne({ username });
    if (!user) return res.status(404).json({ error: "User not found" });

    if (user.hasPurchased) {
      return res.json({ success: true, message: "Already marked purchased" });
    }

    user.hasPurchased = true;
    await user.save();

    log(`✓ User marked purchased: ${username}`);

    
    if (user.referralCode) {
      const referrer = await User.findOne({ username: user.referralCode });
      if (referrer) {
        referrer.referralIncome = (referrer.referralIncome || 0) + 2000;
        referrer.referralCount = (referrer.referralCount || 0) + 1;
        if (!referrer.referrals.includes(username)) {
          referrer.referrals.push(username);
        }
        await referrer.save();
        log(`💸 ₹2000 added to referrer ${referrer.username}`);
      }
    }

    res.json({ success: true, message: "Purchase marked successfully" });
  } catch (err) {
    log("❌ mark-purchase error:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});


router.get("/check-purchase/:username", async (req, res) => {
  try {
    const { username } = req.params;
    const user = await User.findOne({ username });
    if (!user) return res.status(404).json({ hasPurchased: false });
    res.json({ hasPurchased: !!user.hasPurchased });
  } catch (err) {
    log("❌ check-purchase error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

export default router;
