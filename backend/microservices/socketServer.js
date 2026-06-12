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
const User = require("../models/userModel");
const Workspace = require("../models/workspaceModel");

const locationRoom = (workspaceId) => `workspace-location:${workspaceId}`;
const publicLocation = ({ socketId, ...location }) => location;

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
  const workspaceLocations = new Map();

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
    socket.data.locationWorkspaces = new Set();

    const removeSharedLocation = (workspaceId) => {
      const locations = workspaceLocations.get(workspaceId);
      const current = locations?.get(socket.userId);
      if (!current || current.socketId !== socket.id) return;

      locations.delete(socket.userId);
      if (!locations.size) workspaceLocations.delete(workspaceId);
      io.to(locationRoom(workspaceId)).emit("user-location-removed", {
        userId: socket.userId,
        workspaceId,
      });
    };

    socket.on("setup", async () => {
      if (heartbeat) {
        return socket.emit("connected");
      }
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
    socket.on("join-location-workspace", async ({ workspaceId } = {}) => {
      if (!workspaceId) return;
      try {
        const [workspace, user] = await Promise.all([
          Workspace.exists({ _id: workspaceId, users: socket.userId }),
          User.findById(socket.userId).select("name pic"),
        ]);
        if (!workspace || !user) {
          return socket.emit("location-error", {
            message: "You do not have access to this workspace map",
          });
        }

        socket.data.locationWorkspaces.add(workspaceId);
        socket.data.locationUser = {
          userName: user.name,
          userPic: user.pic,
        };
        socket.join(locationRoom(workspaceId));
        const locations = workspaceLocations.get(workspaceId);
        socket.emit(
          "other-users-location",
          locations
            ? [...locations.values()].map((location) =>
                publicLocation(location)
              )
            : []
        );
      } catch (error) {
        console.error("Location workspace join failed:", error.message);
      }
    });
    socket.on("location-update", (payload = {}) => {
      const workspaceId = payload.workspaceId?.toString();
      const latitude = Number(payload.latitude);
      const longitude = Number(payload.longitude);
      const accuracy = Number(payload.accuracy);
      if (
        !workspaceId ||
        !socket.data.locationWorkspaces.has(workspaceId) ||
        !Number.isFinite(latitude) ||
        !Number.isFinite(longitude) ||
        latitude < -90 ||
        latitude > 90 ||
        longitude < -180 ||
        longitude > 180
      ) {
        return;
      }

      const location = {
        userId: socket.userId,
        userName: socket.data.locationUser?.userName || "Workspace member",
        userPic: socket.data.locationUser?.userPic,
        workspaceId,
        latitude,
        longitude,
        accuracy: Number.isFinite(accuracy) ? Math.max(0, accuracy) : null,
        timestamp: Date.now(),
        socketId: socket.id,
      };
      const locations = workspaceLocations.get(workspaceId) || new Map();
      locations.set(socket.userId, location);
      workspaceLocations.set(workspaceId, locations);
      socket
        .to(locationRoom(workspaceId))
        .emit("user-location-updated", publicLocation(location));
    });
    socket.on("location-sharing-stopped", ({ workspaceId } = {}) => {
      if (workspaceId) removeSharedLocation(workspaceId.toString());
    });
    socket.on("leave-location-workspace", ({ workspaceId } = {}) => {
      if (!workspaceId) return;
      const normalizedWorkspaceId = workspaceId.toString();
      removeSharedLocation(normalizedWorkspaceId);
      socket.data.locationWorkspaces.delete(normalizedWorkspaceId);
      socket.leave(locationRoom(normalizedWorkspaceId));
    });
    socket.on("disconnect", async () => {
      clearInterval(heartbeat);
      for (const workspaceId of socket.data.locationWorkspaces) {
        removeSharedLocation(workspaceId);
      }
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
