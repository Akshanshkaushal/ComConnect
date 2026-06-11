const { startHttpService } = require("./runtime");
const { MessageStreamWorker } = require("../services/messageStreamService");

const worker = new MessageStreamWorker();

startHttpService({
  serviceName: "message-persistence-worker",
  port: Number(process.env.PORT || 5106),
  registerRoutes(app) {
    app.get("/worker/status", async (req, res, next) => {
      try {
        res.json(await worker.status());
      } catch (error) {
        next(error);
      }
    });
  },
  async startDependencies() {
    await worker.start();
    return () => worker.close();
  },
}).catch((error) => {
  console.error(error);
  process.exit(1);
});
