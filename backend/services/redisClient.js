const Redis = require("ioredis");

const redisOptions = {
  lazyConnect: true,
  enableReadyCheck: true,
  maxRetriesPerRequest: null,
  retryStrategy(times) {
    return Math.min(times * 100, 3000);
  },
};

const createRedisClient = (connectionName) => {
  const client = process.env.REDIS_URL
    ? new Redis(process.env.REDIS_URL, redisOptions)
    : new Redis({
        host: process.env.REDIS_HOST || "127.0.0.1",
        port: Number(process.env.REDIS_PORT || 6379),
        password: process.env.REDIS_PASSWORD || undefined,
        ...redisOptions,
      });

  client.on("error", (error) => {
    console.error(
      JSON.stringify({
        level: "error",
        service: connectionName,
        dependency: "redis",
        message: error.message,
      })
    );
  });

  return client;
};

const connectRedis = async (client) => {
  if (client.status === "wait") {
    await client.connect();
  }
  return client;
};

const closeRedis = async (client) => {
  if (!client || ["end", "close"].includes(client.status)) return;
  try {
    await client.quit();
  } catch {
    client.disconnect();
  }
};

module.exports = { closeRedis, connectRedis, createRedisClient };
