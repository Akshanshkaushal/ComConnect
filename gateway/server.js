const http = require("http");
const path = require("path");
const cors = require("cors");
const dotenv = require("dotenv");
const express = require("express");
const rateLimit = require("express-rate-limit");
const helmet = require("helmet");
const { createProxyMiddleware } = require("http-proxy-middleware");
const swaggerUi = require("swagger-ui-express");
const YAML = require("yamljs");

dotenv.config({ path: path.resolve(__dirname, "../.env") });
dotenv.config({ path: path.resolve(__dirname, ".env"), override: false });

const app = express();
const port = Number(process.env.PORT || 5000);
const services = {
  identity: process.env.IDENTITY_SERVICE_URL || "http://localhost:5101",
  chat: process.env.CHAT_SERVICE_URL || "http://localhost:5102",
  tasks: process.env.TASK_SERVICE_URL || "http://localhost:5103",
  notifications: process.env.NOTIFICATION_SERVICE_URL || "http://localhost:5104",
  ai: process.env.AI_ORCHESTRATOR_URL || "http://localhost:5105",
  messageWorker:
    process.env.MESSAGE_WORKER_SERVICE_URL || "http://localhost:5106",
};
const allowedOrigins = (process.env.CORS_ORIGIN || "http://localhost:3000")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const isAllowedOrigin = (origin) => {
  if (!origin || allowedOrigins.includes("*") || allowedOrigins.includes(origin)) {
    return true;
  }

  if (process.env.NODE_ENV !== "production") {
    try {
      const { hostname, protocol } = new URL(origin);
      return (
        ["http:", "https:"].includes(protocol) &&
        ["localhost", "127.0.0.1", "::1"].includes(hostname)
      );
    } catch {
      return false;
    }
  }

  return false;
};

app.set("trust proxy", 1);
app.disable("x-powered-by");
app.use(
  helmet({
    contentSecurityPolicy: false,
  })
);
app.use(
  cors({
    origin(origin, callback) {
      if (isAllowedOrigin(origin)) {
        return callback(null, true);
      }
      return callback(new Error(`Origin is not allowed by CORS: ${origin}`));
    },
    credentials: true,
  })
);
app.use(
  "/api",
  rateLimit({
    windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS || 60000),
    limit: Number(process.env.RATE_LIMIT_MAX || 300),
    standardHeaders: "draft-7",
    legacyHeaders: false,
  })
);

app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    service: "api-gateway",
    uptimeSeconds: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});

app.get("/health/services", async (req, res) => {
  const checks = await Promise.all(
    Object.entries(services).map(async ([name, baseUrl]) => {
      try {
        const response = await fetch(`${baseUrl}/health`, {
          signal: AbortSignal.timeout(3000),
        });
        return [name, { status: response.ok ? "ok" : "degraded", code: response.status }];
      } catch (error) {
        return [name, { status: "unavailable", error: error.message }];
      }
    })
  );
  const dependencies = Object.fromEntries(checks);
  const healthy = Object.values(dependencies).every((check) => check.status === "ok");
  res.status(healthy ? 200 : 503).json({
    status: healthy ? "ok" : "degraded",
    dependencies,
  });
});

const openApiDocument = YAML.load(path.join(__dirname, "openapi.yaml"));
app.use(
  "/api-docs",
  swaggerUi.serve,
  swaggerUi.setup(openApiDocument, {
    customSiteTitle: "ComConnect API",
    swaggerOptions: { persistAuthorization: true, displayRequestDuration: true },
  })
);
app.get("/openapi.json", (req, res) => res.json(openApiDocument));

const addProxy = (prefix, target) => {
  app.use(
    prefix,
    createProxyMiddleware({
      target,
      changeOrigin: true,
      xfwd: true,
      pathRewrite: (requestPath) => `${prefix}${requestPath}`,
      on: {
        error(error, req, res) {
          if (!res.headersSent) {
            res.writeHead(502, { "content-type": "application/json" });
          }
          res.end(JSON.stringify({ message: "Upstream service unavailable" }));
        },
      },
    })
  );
};

addProxy("/api/user", services.identity);
addProxy("/api/workspace", services.identity);
addProxy("/api/chat", services.chat);
addProxy("/api/message", services.chat);
addProxy("/api/tasks", services.tasks);
addProxy("/api/notification", services.notifications);
addProxy("/api/ai", services.ai);

const socketProxy = createProxyMiddleware({
  target: services.chat,
  changeOrigin: true,
  ws: true,
  xfwd: true,
});
app.use("/socket.io", socketProxy);

app.use((req, res) => {
  res.status(404).json({ message: `Route not found: ${req.method} ${req.originalUrl}` });
});
app.use((error, req, res, next) => {
  console.error(error);
  res.status(error.status || 500).json({
    message: error.message || "Gateway request failed",
  });
});

const server = http.createServer(app);
server.on("upgrade", socketProxy.upgrade);
server.listen(port, "0.0.0.0", () => {
  console.log(JSON.stringify({ level: "info", service: "api-gateway", port }));
});

const shutdown = (signal) => {
  console.log(JSON.stringify({ level: "info", service: "api-gateway", signal }));
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 10000).unref();
};
process.once("SIGTERM", () => shutdown("SIGTERM"));
process.once("SIGINT", () => shutdown("SIGINT"));
