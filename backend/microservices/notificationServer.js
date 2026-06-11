const { startHttpService } = require("./runtime");
const notificationRoutes = require("../routes/notificationRoutes");
const internalNotificationRoutes = require("../routes/internalNotificationRoutes");
const NotificationService = require("../services/notificationService");

startHttpService({
  serviceName: "notification-service",
  port: Number(process.env.PORT || 5104),
  registerRoutes(app) {
    app.use("/api/notification", notificationRoutes);
    app.use("/internal/notifications", internalNotificationRoutes);
  },
  closeDependencies: () => NotificationService.close(),
}).catch((error) => {
  console.error(error);
  process.exit(1);
});
