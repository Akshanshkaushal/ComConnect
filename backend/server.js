const { startHttpService } = require("./microservices/runtime");
const createSocketServer = require("./microservices/socketServer");
const {
  closeMessageStreamProducer,
  MessageStreamWorker,
} = require("./services/messageStreamService");
const messageWorker = new MessageStreamWorker();

const routes = {
  "/api/user": require("./routes/userRoutes"),
  "/api/workspace": require("./routes/workspaceRoutes"),
  "/api/chat": require("./routes/chatRoutes"),
  "/api/message": require("./routes/messageRoutes"),
  "/api/tasks": require("./routes/taskAllocatorRoutes"),
  "/api/notification": require("./routes/notificationRoutes"),
  "/api/ai": require("./routes/aiRoutes"),
};

startHttpService({
  serviceName: "comconnect-backend",
  port: Number(process.env.PORT || 5000),
  createServer: createSocketServer,
  async startDependencies() {
    await messageWorker.start();
    return async () => {
      await messageWorker.close();
      await closeMessageStreamProducer();
    };
  },
  registerRoutes(app) {
    Object.entries(routes).forEach(([path, router]) => app.use(path, router));
  },
}).catch((error) => {
  console.error(error);
  process.exit(1);
});
