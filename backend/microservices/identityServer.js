const { startHttpService } = require("./runtime");
const userRoutes = require("../routes/userRoutes");
const workspaceRoutes = require("../routes/workspaceRoutes");

startHttpService({
  serviceName: "identity-service",
  port: Number(process.env.PORT || 5101),
  registerRoutes(app) {
    app.use("/api/user", userRoutes);
    app.use("/api/workspace", workspaceRoutes);
  },
}).catch((error) => {
  console.error(error);
  process.exit(1);
});
