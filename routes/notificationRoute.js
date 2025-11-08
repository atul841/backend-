import express from "express";
import Notification from "../models/Notification.js";

const router = express.Router();

// Add new notification (called on user register)
router.post("/", async (req, res) => {  
  try {      
    const { username, message } = req.body;
    const notif = new Notification({ username, message });
    await notif.save();
    res.status(201).json({ message: "Notification added" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all notifications for a user
router.get("/:username", async (req, res) => {
  try {
    const { username } = req.params;
    const notifs = await Notification.find({ username }).sort({
      createdAt: -1,
    });
    res.json(notifs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
