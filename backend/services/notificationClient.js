const notificationServiceUrl =
  process.env.NOTIFICATION_SERVICE_URL || "http://localhost:5104";

const queueChatNotifications = async ({ recipients, title, body, data }) => {
  if (!recipients.length) return;

  const response = await fetch(`${notificationServiceUrl}/internal/notifications/chat-message`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-service-token": process.env.INTERNAL_SERVICE_TOKEN || "local-internal-token",
    },
    body: JSON.stringify({ recipients, title, body, data }),
    signal: AbortSignal.timeout(Number(process.env.INTERNAL_REQUEST_TIMEOUT_MS || 5000)),
  });

  if (!response.ok) {
    throw new Error(`Notification service returned ${response.status}`);
  }
};

module.exports = { queueChatNotifications };
