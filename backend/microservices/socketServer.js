const http = require("http");
const os = require("os");
const jwt = require("jsonwebtoken");
const { createAdapter } = require("@socket.io/redis-adapter");
const { Server } = require("socket.io");
const { parseOrigins } = require("./runtime");
const {
  closeRedis,
  connectRedis,
  createRedisClient,
} = require("../services/redisClient");
const {
  getPresenceService,
  presenceTtlSeconds,
} = require("../services/presenceService");

const createSocketServer = async (app) => {
  const server = http.createServer(app);
  const pubClient = createRedisClient("socket-adapter-publisher");
  const subClient = createRedisClient("socket-adapter-subscriber");
  await Promise.all([connectRedis(pubClient), connectRedis(subClient)]);

  const io = new Server(server, {
    pingTimeout: 60000,
    cors: {
      origin: parseOrigins(),
      methods: ["GET", "POST"],
      credentials: true,
    },
    transports: ["websocket", "polling"],
  });
  io.adapter(createAdapter(pubClient, subClient));

  const presence = await getPresenceService();
  const serverId = process.env.SOCKET_SERVER_ID || os.hostname();
  const refreshIntervalMs = Math.max(10000, Math.floor(presenceTtlSeconds * 500));

  io.use((socket, next) => {
    const authorization = socket.handshake.headers.authorization;
    const token =
      socket.handshake.auth?.token ||
      (authorization?.startsWith("Bearer ") ? authorization.slice(7) : null);
    if (!token) return next(new Error("Authentication required"));
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.id.toString();
      return next();
    } catch {
      return next(new Error("Invalid authentication token"));
    }
  });

  io.on("connection", (socket) => {
    let heartbeat;

    socket.on("setup", async () => {
      socket.join(socket.userId);
      const state = await presence.register({
        userId: socket.userId,
        socketId: socket.id,
        serverId,
      });
      io.emit("presence changed", state);
      socket.emit("connected", state);
      heartbeat = setInterval(() => {
        presence.refresh(socket.id).catch((error) => {
          console.error("Presence refresh failed:", error.message);
        });
      }, refreshIntervalMs);
      heartbeat.unref?.();
    });

    socket.on("join chat", (room) => {
      if (room) socket.join(room);
    });
    socket.on("typing", (room) => socket.to(room).emit("typing"));
    socket.on("stop typing", (room) => socket.to(room).emit("stop typing"));
    socket.on("new message", (message) => {
      const senderId = message?.sender?._id;
      for (const user of message?.chat?.users || []) {
        if (user._id?.toString() !== senderId?.toString()) {
          socket.to(user._id.toString()).emit("message recieved", message);
        }
      }
    });
    socket.on("disconnect", async () => {
      clearInterval(heartbeat);
      try {
        const state = await presence.unregister(socket.id);
        if (state) io.emit("presence changed", state);
      } catch (error) {
        console.error("Presence cleanup failed:", error.message);
      }
    });
  });

  server.comconnectCloseDependencies = async () => {
    await io.close();
    await Promise.all([closeRedis(pubClient), closeRedis(subClient), presence.close()]);
  };
  return server;
};

module.exports = createSocketServer;
