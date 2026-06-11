const express = require("express");
const NotificationService = require("../services/notificationService");

const router = express.Router();

router.use((req, res, next) => {
  const expectedToken = process.env.INTERNAL_SERVICE_TOKEN || "local-internal-token";
  if (req.headers["x-service-token"] !== expectedToken) {
    return res.status(401).json({ message: "Invalid service credentials" });
  }
  return next();
});

router.post("/chat-message", async (req, res, next) => {
  try {
    const { recipients = [], title, body, data = {} } = req.body;
    if (!Array.isArray(recipients) || !title || !body) {
      return res.status(400).json({ message: "recipients, title, and body are required" });
    }

    await Promise.all(
      recipients.map((userId) =>
        NotificationService.queueNotification({
          userId: userId.toString(),
          title,
          body,
          data,
        })
      )
    );

    return res.status(202).json({ queued: recipients.length });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
