const http = require("http");
const { Server } = require("socket.io");
const { parseOrigins } = require("./runtime");

const createSocketServer = (app) => {
  const server = http.createServer(app);
  const io = new Server(server, {
    pingTimeout: 60000,
    cors: {
      origin: parseOrigins(),
      methods: ["GET", "POST"],
      credentials: true,
    },
    transports: ["websocket", "polling"],
  });

  io.on("connection", (socket) => {
    socket.on("setup", (user) => {
      if (!user?._id) return;
      socket.join(user._id);
      socket.emit("connected");
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
  });

  return server;
};

module.exports = createSocketServer;
