import express from 'express';
import shortid from 'shortid';
import User from '../models/User.mjs';

const router = express.Router();

// 💰 Commission tiers per level (level 1 = immediate referrer)
const COMMISSION_TIERS = [2000, 1000, 500, 150, 50, 2.5];

// 🧮 Commission calculation per level
function computeCommissionForLevel(level) {
  if (level <= 0) return 0;
  if (level <= COMMISSION_TIERS.length) return COMMISSION_TIERS[level - 1];
  // After level 6 → always give 2.5 (not halved)
  return 2.5;
}
        
// 🔢 Generate unique referral code
async function generateUniqueCode() {
  let code;
  let exists = true;
  while (exists) {
    code = shortid.generate();
    exists = await User.findOne({ referralCode: code });
  }
  return code;
}

// 🧍 Create new user + generate referral link
router.post('/user', async (req, res) => {
  const { name, email } = req.body;
  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ message: 'User with this email already exists.' });
    }

    const code = await generateUniqueCode();
    const user = new User({ name, email, referralCode: code });
    await user.save();

    const referralLink = `https://yourdomain.com/signup?ref=${user.referralCode}`;

    res.json({
      message: '✅ User created successfully!',
      user,
      referralLink
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
});

// 🔍 Get user by ID
router.get('/user/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
});

// 🛒 Purchase route
router.post('/purchase', async (req, res) => {
  const { buyerEmail, buyerName, refCode } = req.body;
  try {
    // 1️⃣ Find or create buyer
    let buyer = buyerEmail ? await User.findOne({ email: buyerEmail }) : null;
    if (!buyer) {
      const code = await generateUniqueCode();
      buyer = new User({
        name: buyerName || 'Buyer',
        email: buyerEmail,
        referralCode: code
      });
      await buyer.save();
    }

    // 2️⃣ Prevent duplicate purchase rewards
    if (buyer.hasPurchased) {
      return res.status(409).json({
        message: 'User already made a purchase. No new commission added.',
        buyerId: buyer._id,
      });
    }

    buyer.hasPurchased = true;
    await buyer.save();

    // 3️⃣ Find referrer using referral code
    const referrer = refCode ? await User.findOne({ referralCode: refCode }) : null;

    // 4️⃣ Link buyer → referrer if not already linked
    if (referrer && (!buyer.referrer || buyer.referrer.toString() !== referrer._id.toString())) {
      buyer.referrer = referrer._id;
      await buyer.save();

      referrer.referralCount = (referrer.referralCount || 0) + 1;
      await referrer.save();
    }

    // 5️⃣ Build the referral chain (up to 10 levels)
    const chain = [];
    let current = buyer.referrer ? await User.findById(buyer.referrer) : null;
    let level = 1;
    while (current && level <= 10) {
      chain.push(current);
      if (!current.referrer) break;
      current = await User.findById(current.referrer);
      level++;
    }

    // 6️⃣ Distribute commissions / points
    const allocations = [];
    for (let i = 0; i < chain.length; i++) {
      const user = chain[i];
      const level = i + 1;

      if (user.referralCount >= 5) {
        // Reward points instead of commission
        user.points = (user.points || 0) + 2.5;
        allocations.push({ userId: user._id, level, type: 'points', amount: 2.5 });
      } else {
        // Regular commission
        const commission = computeCommissionForLevel(level);
        user.balance = (user.balance || 0) + commission;
        allocations.push({ userId: user._id, level, type: 'balance', amount: commission });
      }

      await user.save();
    }

    res.json({
      message: '✅ Purchase processed successfully',
      buyerId: buyer._id,
      allocations,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
});

// 📜 Get all users (for admin/debug)
router.get('/users', async (req, res) => {
  try {
    const users = await User.find().select('name email balance points referralCount referralCode referrer hasPurchased');
    res.json(users);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
});

export default router;
