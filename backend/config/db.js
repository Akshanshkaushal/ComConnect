const mongoose = require("mongoose");

const resolveMongoUri = () => {
  if (!process.env.MONGO_URI) {
    throw new Error("MONGO_URI is not defined");
  }

  return process.env.MONGO_URI
    .replace("<username>", encodeURIComponent(process.env.DB_USERNAME || ""))
    .replace("<password>", encodeURIComponent(process.env.DB_PASSWORD || ""));
};

const connectDatabase = async () => {
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  await mongoose.connect(resolveMongoUri(), {
    serverSelectionTimeoutMS: Number(process.env.MONGO_CONNECT_TIMEOUT_MS || 30000),
    socketTimeoutMS: Number(process.env.MONGO_SOCKET_TIMEOUT_MS || 60000),
    maxPoolSize: Number(process.env.MONGO_POOL_SIZE || 10),
  });

  return mongoose.connection;
};

module.exports = connectDatabase;
