const { startHttpService } = require("./runtime");
const createSocketServer = require("./socketServer");
const chatRoutes = require("../routes/chatRoutes");
const messageRoutes = require("../routes/messageRoutes");
const {
  closeMessageStreamProducer,
} = require("../services/messageStreamService");

startHttpService({
  serviceName: "chat-service",
  port: Number(process.env.PORT || 5102),
  createServer: createSocketServer,
  registerRoutes(app) {
    app.use("/api/chat", chatRoutes);
    app.use("/api/message", messageRoutes);
  },
  closeDependencies: closeMessageStreamProducer,
}).catch((error) => {
  console.error(error);
  process.exit(1);
});
