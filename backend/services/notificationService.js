const admin = require("../config/firebase");
const { Kafka, logLevel } = require("kafkajs");
const Redis = require("ioredis");

const topic = process.env.KAFKA_NOTIFICATION_TOPIC || "chat-notifications";

const createRedisClient = () => {
  if (process.env.REDIS_URL) {
    return new Redis(process.env.REDIS_URL, {
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
    });
  }

  return new Redis({
    host: process.env.REDIS_HOST || "127.0.0.1",
    port: Number(process.env.REDIS_PORT || 6379),
    password: process.env.REDIS_PASSWORD || undefined,
    tls: process.env.REDIS_TLS === "true" ? {} : undefined,
    maxRetriesPerRequest: 3,
  });
};

const createKafka = () => {
  const options = {
    clientId: process.env.KAFKA_CLIENT_ID || "notification-service",
    brokers: (process.env.KAFKA_BROKER || "localhost:9092")
      .split(",")
      .map((broker) => broker.trim()),
    connectionTimeout: Number(process.env.KAFKA_CONNECTION_TIMEOUT_MS || 10000),
    logLevel: process.env.NODE_ENV === "production" ? logLevel.WARN : logLevel.INFO,
    ssl: process.env.KAFKA_SSL === "true",
  };

  if (process.env.KAFKA_USERNAME && process.env.KAFKA_PASSWORD) {
    options.sasl = {
      mechanism: process.env.KAFKA_SASL_MECHANISM || "plain",
      username: process.env.KAFKA_USERNAME,
      password: process.env.KAFKA_PASSWORD,
    };
  }

  return new Kafka(options);
};

class NotificationService {
  constructor() {
    this.redis = createRedisClient();
    this.kafka = createKafka();
    this.producer = this.kafka.producer();
    this.consumer = this.kafka.consumer({
      groupId: process.env.KAFKA_GROUP_ID || "notification-workers",
    });
    this.kafkaConnected = false;
    this.initializePromise = this.initialize();
  }

  async initialize() {
    try {
      await this.producer.connect();
      await this.consumer.connect();
      await this.consumer.subscribe({ topic });
      this.kafkaConnected = true;

      await this.consumer.run({
        eachMessage: async ({ message }) => {
          try {
            await this.sendNotification(JSON.parse(message.value.toString()));
          } catch (error) {
            console.error("Notification delivery failed:", error.message);
          }
        },
      });
    } catch (error) {
      this.kafkaConnected = false;
      console.error("Notification queue unavailable; direct delivery fallback enabled:", error.message);
    }
  }

  async testRedisConnection() {
    return (await this.redis.ping()) === "PONG";
  }

  async testKafkaConnection() {
    await this.initializePromise;
    return this.kafkaConnected;
  }

  async testConnections() {
    let redisReady = false;
    try {
      redisReady = await this.testRedisConnection();
    } catch (error) {
      console.error("Redis health check failed:", error.message);
    }

    return {
      redis: redisReady,
      kafka: await this.testKafkaConnection(),
      timestamp: new Date().toISOString(),
    };
  }

  async sendNotification({ userId, title, body, data = {} }) {
    const token = await this.getFCMToken(userId);
    if (!token) return null;

    try {
      return await admin.messaging().send({
        token,
        notification: { title, body },
        data: Object.fromEntries(
          Object.entries(data).map(([key, value]) => [key, String(value ?? "")])
        ),
        webpush: {
          headers: { Urgency: "high" },
          notification: {
            title,
            body,
            icon: "/icon.png",
            badge: "/badge.png",
            tag: data.chatId ? `chat-${data.chatId}` : undefined,
          },
          fcmOptions: {
            link: data.chatId ? `/chat/${data.chatId}` : "/",
          },
        },
      });
    } catch (error) {
      if (
        error.code === "messaging/invalid-registration-token" ||
        error.code === "messaging/registration-token-not-registered"
      ) {
        await this.redis.del(`user:${userId}:fcmToken`);
      }
      throw error;
    }
  }

  async queueNotification(notification) {
    await this.initializePromise;
    if (!this.kafkaConnected) {
      return this.sendNotification(notification);
    }

    await this.producer.send({
      topic,
      messages: [
        {
          key: notification.userId,
          value: JSON.stringify(notification),
          headers: { timestamp: Date.now().toString() },
        },
      ],
    });
    return true;
  }

  async cacheUserToken(userId, fcmToken) {
    await this.redis.set(`user:${userId}:fcmToken`, fcmToken);
  }

  async getFCMToken(userId) {
    return this.redis.get(`user:${userId}:fcmToken`);
  }

  async close() {
    await Promise.allSettled([
      this.producer.disconnect(),
      this.consumer.disconnect(),
      this.redis.quit(),
    ]);
  }
}

module.exports = new NotificationService();
