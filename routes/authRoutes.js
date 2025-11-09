// import express from "express";
// import bcrypt from "bcrypt";
// import jwt from "jsonwebtoken";
// import crypto from "crypto";
// import nodemailer from "nodemailer";
// import User from "../models/User.js";
// import ResetToken from "../models/ResetToken.js"; // 🔹 new model

// const router = express.Router();

// // =============== REGISTER API ===============
// router.post("/register", async (req, res) => {
//   try {
//     const {
//       name,
//       mobile,
//       email,
//       password,
//       transactionPin,
//       referralCode,
//       referralName,
//     } = req.body;

//     const existingUser = await User.findOne({ email });
//     if (existingUser)
//       return res.status(400).json({ message: "Email already registered!" });

//     const hashedPassword = await bcrypt.hash(password, 10);
//     const hashedPin = await bcrypt.hash(transactionPin, 10);

//     const username = `V&V25${Math.floor(100000 + Math.random() * 900000)}`;

//     const newUser = new User({
//       name,
//       mobile,
//       email,
//       username,
//       password: hashedPassword,
//       transactionPin: hashedPin,
//       referralCode,
//       referralName,
//       hasPurchased: false,
//       referralIncome: 0,
//       referralCount: 0,
//       referrals: [],
//     });

//     await newUser.save();

//     if (referralCode && referralName) {
//       const referrer = await User.findOne({ username: referralCode });
//       if (referrer) {
//         const message = `🎉 ${name} has registered using your referral link!`;
//         referrer.notifications.push({ message });
//         referrer.referralCount = (referrer.referralCount || 0) + 1;
//         await referrer.save();
//       }
//     }

//     res.status(201).json({
//       message: "Registration successful! Please log in.",
//       username,
//     });
//   } catch (err) {
//     console.error("Registration Error:", err);
//     res.status(500).json({ message: "Server error", error: err.message });
//   }
// });

// // =============== LOGIN API ===============
// router.post("/login", async (req, res) => {
//   try {
//     const { username, password } = req.body;

//     const user = await User.findOne({ username });
//     if (!user) return res.status(400).json({ message: "User not found!" });

//     const match = await bcrypt.compare(password, user.password);
//     if (!match)
//       return res.status(400).json({ message: "Invalid credentials!" });

//     const token = jwt.sign({ id: user._id }, "mySecretKey", { expiresIn: "7d" });

//     res.json({
//       message: "Login successful!",
//       token,
//       user: {
//         id: user._id,
//         name: user.name,
//         email: user.email,
//         username: user.username,
//         hasPurchased: user.hasPurchased || false,
//         notifications: user.notifications || [],
//       },
//     });
//   } catch (err) {
//     console.error("Login Error:", err);
//     res.status(500).json({ message: "Server error", error: err.message });
//   }
// });

// // ===========================================================
// // ✅ STEP 1: REQUEST PASSWORD RESET (send email with link)
// // ===========================================================
// router.post("/request-password-reset", async (req, res) => {
//   try {
//     const { email } = req.body;

//     const user = await User.findOne({ email });
//     if (!user)
//       return res.status(400).json({ message: "No user found with this email" });

//     const token = crypto.randomBytes(32).toString("hex");
//     await ResetToken.create({ userId: user._id, token });

//     const resetLink = `${process.env.FRONTEND_URL}/reset-password/${token}`;

//     const transporter = nodemailer.createTransport({
//       service: "gmail",
//       auth: {
//         user: process.env.EMAIL_USER,
//         pass: process.env.EMAIL_PASS,
//       },
//     });

//     await transporter.sendMail({
//   from: `"V&V.ai Support" <donotreply@vandv.ai>`,  
//   to: user.email,
//   subject: "Reset Your Password | V&V.ai Learn & Earn Platform 🔐",
//   html: `
//   <div style="font-family: Arial, sans-serif; background-color: #f9f9f9; padding: 30px;">
//     <div style="max-width: 650px; background: #ffffff; margin: auto; border-radius: 10px; padding: 25px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
//       <h2 style="color: #1a8917; text-align: center;">🔐 Reset Your Password</h2>
//       <p>Dear <strong>${user.name}</strong>,</p>
//       <p>We received a request to reset the password for your <strong>V&V.ai Learn & Earn</strong> account.</p>
//       <p>To create a new password, please click the secure link below:</p>

//       <div style="text-align: center; margin: 25px 0;">
//         <a href="${resetLink}" style="background-color: #1a8917; color: #fff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: bold;">👉 Reset Your Password</a>
//       </div>

//       <p>This link will redirect you to our password reset page, where you can create a new password.</p>
//       <p><strong>Please ensure your new password meets the following requirements:</strong></p>
//       <ul style="margin-left: 20px;">
//         <li>Minimum <strong>6 characters</strong></li>
//         <li>At least one <strong>special character</strong> (e.g., !, @, #, $, %)</li>
//       </ul>

//       <p>Once your password has been updated, you can log in to your account here:</p>
//       <p><a href="https://vandv.ai/login" style="color: #1a8917; text-decoration: none; font-weight: bold;">🔗 Login to Your Account</a></p>

//       <hr style="margin: 25px 0; border: 0; border-top: 1px solid #ddd;" />

//       <h3 style="color: #ff9800;">⚠️ Important Security Note:</h3>
//       <ul style="margin-left: 20px;">
//         <li><strong>For your safety</strong>, the reset link will automatically expire after <strong>10 minutes</strong>.</li>
//         <li><strong>Do not share</strong> this reset link with anyone.</li>
//         <li>This email contains sensitive information — please keep it private and secure.</li>
//       </ul>

//       <p style="font-size: 12px; color: #777;">
//         <strong>Note:</strong> This is an automated message from <strong>donotreply@vandv.ai</strong>.<br/>
//         Please do not reply to this email.
//       </p>

//       <p style="margin-top: 25px; font-size: 14px; color: #333;">
//         Warm regards,<br/>
//         <strong>Team V&V.ai</strong><br/>
//         <em>Learn. Earn. Grow.</em><br/>
//         <a href="https://www.vandv.ai" style="color: #1a8917; text-decoration: none;">www.vandv.ai</a>
//       </p>
//     </div>
//   </div>
//   `,
// });



//     res.json({ message: "Password reset link sent to your email!" });
//   } catch (error) {
//     console.error("Request Password Reset Error:", error);
//     res.status(500).json({ message: "Failed to send reset email!" });
//   }
// });
  
// //  Resgistraion email and password change here



// router.post("/send-welcome-email", async (req, res) => {
//   const { email, name, username, password } = req.body;

//   try {
//     // ✅ Gmail SMTP transporter
//     const transporter = nodemailer.createTransport({
//       service: "gmail",
//       auth: {
//         user: process.env.EMAIL_USER,
//         pass: process.env.EMAIL_PASS,
//       },
//     });

//     // ✅ Email content (matches your sample screenshot)
//     const mailOptions = {
//       from: `"V&V.ai Learn & Earn" <${process.env.EMAIL_USER}>`,
//       to: email,
//       subject: "Welcome to V&V.ai | Start Your Learn & Earn Journey 🚀",
//       html: `
//       <div style="font-family: Arial, sans-serif; background-color: #f8f9fa; padding: 20px;">
//         <div style="max-width: 600px; margin: auto; background: #ffffff; border-radius: 10px; box-shadow: 0 4px 10px rgba(0,0,0,0.1); overflow: hidden; border-top: 5px solid #28a745;">
          
//           <div style="background: #28a745; color: white; text-align: center; padding: 20px;">
//             <h2>Welcome to V&V.ai | Start Your Learn & Earn Journey 🚀</h2>
//           </div>

//           <div style="padding: 25px; color: #333;">
//             <p>Dear <strong>${name}</strong>,</p>

//             <p>
//               Congratulations and welcome to 
//               <a href="https://www.vandv.ai" target="_blank" style="color: #28a745; text-decoration: none;">
//                 www.VandV.ai
//               </a> — India’s first <em>“We Pay You to Learn”</em> platform.
//             </p>

//             <p>
//               You are now part of our exclusive <strong>Learn & Earn Program</strong>,
//               where knowledge directly converts into income.
//             </p>

//             <p>Your login credentials are below:</p>

//             <div style="background: #f1f1f1; padding: 15px; border-radius: 8px; margin: 15px 0;">
//               <p><strong>User ID:</strong> ${username}</p>
//               <p><strong>Password:</strong> ${password}</p>
//             </div>

//             <p>
//               <strong>Login Link:</strong>
//               <a href="https://vandv.ai/login" target="_blank" style="color: #28a745; text-decoration: none;">
//                 Click here
//               </a> to access your account.
//             </p>

//             <p>
//               Start your journey from <strong>Knowledge → Income</strong> today!<br/>
//               Access your courses, track your <strong>Udyam-Point</strong>, and explore exciting income-based learning opportunities.
//             </p>

//             <hr style="margin: 25px 0; border: none; border-top: 1px solid #ddd;" />

//             <p style="font-weight: bold; color: #ff9900;">⚠️ Important:</p>
//             <ul style="font-size: 14px; color: #555; line-height: 1.6;">
//               <li>This email contains confidential login information.</li>
//               <li>Please <strong>do not share</strong> these credentials with anyone.</li>
//               <li>Keep this email private and secure.</li>
//             </ul>

//             <p style="font-size: 13px; color: #777;">
//               <strong>Note:</strong> This is an automated message from 
//               <strong>donotreply@vandv.ai</strong> — please do not reply to this email.
//             </p>

//             <p style="margin-top: 25px;">
//               Warm regards,<br/>
//               <strong>Team V&V.ai</strong><br/>
//               <em>Learn. Earn. Grow.</em><br/>
//               <a href="https://www.vandv.ai" target="_blank" style="color: #28a745;">www.vandv.ai</a>
//             </p>
//           </div>
//         </div>
//       </div>
//       `,
//     };

//     // ✅ Send email
//     await transporter.sendMail(mailOptions);
//     res.json({ message: "Welcome email sent successfully!" });
//   } catch (err) {
//     console.error("Email send error:", err);
//     res.status(500).json({ message: "Email sending failed", error: err.message });
//   }
// });





// // ===========================================================
// // ✅ STEP 2: RESET PASSWORD (after clicking email link)
// // ===========================================================
// router.post("/reset-password", async (req, res) => {
//   try {
//     const { token, newPassword } = req.body;

//     const tokenDoc = await ResetToken.findOne({ token });
//     if (!tokenDoc)
//       return res.status(400).json({ message: "Invalid or expired token" });

//     const user = await User.findById(tokenDoc.userId);
//     if (!user) return res.status(400).json({ message: "User not found" });

//     const hashedPassword = await bcrypt.hash(newPassword, 10);
//     user.password = hashedPassword;
//     await user.save();

//     await ResetToken.deleteOne({ token });

//     res.json({ message: "Password reset successful!" });
//   } catch (err) {
//     console.error("Reset Password Error:", err);
//     res.status(500).json({ message: "Server error", error: err.message });
//   }
// });

// export default router;







import express from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import nodemailer from "nodemailer";
import User from "../models/User.js";
import ResetToken from "../models/ResetToken.js";

const router = express.Router();

// ================= REGISTER =================
router.post("/register", async (req, res) => {
  try {
    const {
      name,
      mobile,
      email,
      password,
      transactionPin,
      referralCode,
      referralName,
    } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser)
      return res.status(400).json({ message: "Email already registered!" });

    const hashedPassword = await bcrypt.hash(password, 10);
    const hashedPin = await bcrypt.hash(transactionPin, 10);

    const username = `V&V25${Math.floor(100000 + Math.random() * 900000)}`;

    const newUser = new User({
      name,
      mobile,
      email,
      username,
      password: hashedPassword,
      transactionPin: hashedPin,
      referralCode,
      referralName,
      hasPurchased: false,
      referralIncome: 0,
      referralCount: 0,
      referrals: [],
    });

    await newUser.save();

    if (referralCode && referralName) {
      const referrer = await User.findOne({ username: referralCode });
      if (referrer) {
        const message = `🎉 ${name} has registered using your referral link!`;
        referrer.notifications.push({ message });
        referrer.referralCount = (referrer.referralCount || 0) + 1;
        await referrer.save();
      }
    }

    res.status(201).json({
      message: "Registration successful! Please log in.",
      username,
    });
  } catch (err) {
    console.error("Registration Error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// ================= LOGIN =================
router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    const user = await User.findOne({ username });
    if (!user) return res.status(400).json({ message: "User not found!" });

    const match = await bcrypt.compare(password, user.password);
    if (!match)
      return res.status(400).json({ message: "Invalid credentials!" });

    const token = jwt.sign({ id: user._id }, "mySecretKey", { expiresIn: "7d" });

    res.json({
      message: "Login successful!",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        username: user.username,
        hasPurchased: user.hasPurchased || false,
        notifications: user.notifications || [],
      },
    });
  } catch (err) {
    console.error("Login Error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// ================= PASSWORD RESET REQUEST =================
router.post("/request-password-reset", async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user)
      return res.status(400).json({ message: "No user found with this email" });

    const token = crypto.randomBytes(32).toString("hex");
    await ResetToken.create({ userId: user._id, token });

    const resetLink = `${process.env.FRONTEND_URL}/reset-password/${token}`;

    // ✅ Zoho SMTP configuration
    const transporter = nodemailer.createTransport({
      host: "smtp.zoho.in",
      port: 465,
      secure: true,
      auth: {
        user: process.env.EMAIL_USER, // donotreply@vandv.ai
        pass: process.env.EMAIL_PASS, // Zoho app password
      },
    });

    await transporter.sendMail({
      from: `"V&V.ai Support" <${process.env.EMAIL_USER}>`,
      to: user.email,
      subject: "Reset Your Password | V&V.ai Learn & Earn Platform 🔐",
      html: `
        <div style="font-family: Arial, sans-serif; background-color: #f9f9f9; padding: 30px;">
          <div style="max-width: 650px; background: #ffffff; margin: auto; border-radius: 10px; padding: 25px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
            <h2 style="color: #1a8917; text-align: center;">🔐 Reset Your Password</h2>
            <p>Dear <strong>${user.name}</strong>,</p>
            <p>Click below to reset your password:</p>
            <div style="text-align: center; margin: 25px 0;">
              <a href="${resetLink}" style="background-color: #1a8917; color: #fff; padding: 12px 24px; border-radius: 6px; text-decoration: none;">👉 Reset Password</a>
            </div>
            <p>This link expires in 10 minutes. Please keep it private.</p>
            <hr />
            <p style="font-size: 12px; color: #777;">Note: This is an automated message from donotreply@vandv.ai</p>
          </div>
        </div>
      `,
    });

    res.json({ message: "Password reset link sent to your email!" });
  } catch (error) {
    console.error("Request Password Reset Error:", error);
    res.status(500).json({ message: "Failed to send reset email!" });
  }
});

// ================= WELCOME EMAIL =================
router.post("/send-welcome-email", async (req, res) => {
  const { email, name, username, password } = req.body;

  try {
    // ✅ Zoho SMTP transporter
    const transporter = nodemailer.createTransport({
      host: "smtp.zoho.in",
      port: 465,
      secure: true,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const mailOptions = {
      from: `"V&V.ai Learn & Earn" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Welcome to V&V.ai | Start Your Learn & Earn Journey 🚀",
      html: `
        <div style="font-family: Arial, sans-serif; background-color: #f8f9fa; padding: 20px;">
          <div style="max-width: 600px; margin: auto; background: #ffffff; border-radius: 10px; overflow: hidden; border-top: 5px solid #28a745;">
            <div style="background: #28a745; color: white; text-align: center; padding: 20px;">
              <h2>Welcome to V&V.ai | Start Your Learn & Earn Journey 🚀</h2>
            </div>
            <div style="padding: 25px; color: #333;">
              <p>Dear <strong>${name}</strong>,</p>
              <p>Welcome to <a href="https://www.vandv.ai" style="color: #28a745;">www.VandV.ai</a> — India’s first “We Pay You to Learn” platform.</p>
              <p>Your login credentials:</p>
              <div style="background: #f1f1f1; padding: 15px; border-radius: 8px;">
                <p><strong>User ID:</strong> ${username}</p>
                <p><strong>Password:</strong> ${password}</p>
              </div>
              <p><strong>Login:</strong> <a href="https://vandv.ai/login" style="color: #28a745;">Click here</a></p>
              <hr />
              <p style="font-size: 12px; color: #777;">Note: This is an automated email from donotreply@vandv.ai</p>
            </div>
          </div>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    res.json({ message: "Welcome email sent successfully!" });
  } catch (err) {
    console.error("Email send error:", err);
    res.status(500).json({ message: "Email sending failed", error: err.message });
  }
});

// ================= RESET PASSWORD =================
router.post("/reset-password", async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    const tokenDoc = await ResetToken.findOne({ token });
    if (!tokenDoc)
      return res.status(400).json({ message: "Invalid or expired token" });

    const user = await User.findById(tokenDoc.userId);
    if (!user) return res.status(400).json({ message: "User not found" });

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    await user.save();

    await ResetToken.deleteOne({ token });

    res.json({ message: "Password reset successful!" });
  } catch (err) {
    console.error("Reset Password Error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

export default router;

