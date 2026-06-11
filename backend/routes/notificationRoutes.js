const express = require("express");
const { protect } = require("../middleware/authMiddleware");
const NotificationService = require("../services/notificationService");
const User = require("../models/userModel");

const router = express.Router();

router.post("/token", protect, async (req, res, next) => {
  try {
    const { fcmToken } = req.body;
    if (!fcmToken) {
      return res.status(400).json({ message: "fcmToken is required" });
    }

    await Promise.all([
      User.findByIdAndUpdate(req.user._id, { fcmToken }),
      NotificationService.cacheUserToken(req.user._id.toString(), fcmToken),
    ]);
    return res.json({ message: "Notification token updated" });
  } catch (error) {
    return next(error);
  }
});

router.get("/status", protect, async (req, res, next) => {
  try {
    return res.json(await NotificationService.testConnections());
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
