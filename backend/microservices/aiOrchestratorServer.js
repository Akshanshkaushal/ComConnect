const { startHttpService } = require("./runtime");
const aiRoutes = require("../routes/aiRoutes");

startHttpService({
  serviceName: "ai-orchestrator",
  port: Number(process.env.PORT || 5105),
  registerRoutes(app) {
    app.use("/api/ai", aiRoutes);
  },
}).catch((error) => {
  console.error(error);
  process.exit(1);
});
