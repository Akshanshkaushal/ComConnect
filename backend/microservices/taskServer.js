const { startHttpService } = require("./runtime");
const taskRoutes = require("../routes/taskAllocatorRoutes");

startHttpService({
  serviceName: "task-service",
  port: Number(process.env.PORT || 5103),
  registerRoutes(app) {
    app.use("/api/tasks", taskRoutes);
  },
}).catch((error) => {
  console.error(error);
  process.exit(1);
});
