const crypto = require("crypto");
const { closeRedis, connectRedis, createRedisClient } = require("./redisClient");
const { persistMessage } = require("./messagePersistenceService");

const streamKey = process.env.MESSAGE_STREAM_KEY || "chat:messages";
const deadLetterStreamKey =
  process.env.MESSAGE_DLQ_STREAM_KEY || "chat:messages:dead-letter";
const consumerGroup =
  process.env.MESSAGE_STREAM_CONSUMER_GROUP || "message-persistence";
const resultKey = (eventId) => `chat:message:result:${eventId}`;
const resultTtlSeconds = Number(process.env.MESSAGE_RESULT_TTL_SECONDS || 60);

const fieldsToObject = (fields) => {
  const result = {};
  for (let index = 0; index < fields.length; index += 2) {
    result[fields[index]] = fields[index + 1];
  }
  return result;
};

class MessageStreamProducer {
  constructor() {
    this.redis = createRedisClient("chat-message-producer");
  }

  async connect() {
    await connectRedis(this.redis);
    return this;
  }

  async enqueue({ senderId, content, chatId, requestId }) {
    const eventId = requestId || crypto.randomUUID();
    await this.redis.xadd(
      streamKey,
      "MAXLEN",
      "~",
      Number(process.env.MESSAGE_STREAM_MAX_LENGTH || 100000),
      "*",
      "eventId",
      eventId,
      "senderId",
      senderId.toString(),
      "chatId",
      chatId.toString(),
      "content",
      content,
      "createdAt",
      new Date().toISOString()
    );
    return this.waitForResult(eventId);
  }

  async waitForResult(eventId) {
    const timeoutMs = Number(process.env.MESSAGE_PERSIST_TIMEOUT_MS || 10000);
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      const raw = await this.redis.get(resultKey(eventId));
      if (raw) {
        const result = JSON.parse(raw);
        if (result.ok) return result.message;
        const error = new Error(result.message || "Message persistence failed");
        error.statusCode = result.statusCode || 500;
        throw error;
      }
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    const error = new Error("Message persistence timed out");
    error.statusCode = 503;
    throw error;
  }

  async close() {
    await closeRedis(this.redis);
  }
}

class MessageStreamWorker {
  constructor() {
    this.redis = createRedisClient("message-persistence-worker");
    this.running = false;
    this.consumerName =
      process.env.MESSAGE_STREAM_CONSUMER_NAME ||
      `worker-${process.pid}-${crypto.randomBytes(4).toString("hex")}`;
  }

  async start() {
    await connectRedis(this.redis);
    try {
      await this.redis.xgroup(
        "CREATE",
        streamKey,
        consumerGroup,
        "0",
        "MKSTREAM"
      );
    } catch (error) {
      if (!error.message.includes("BUSYGROUP")) throw error;
    }
    this.running = true;
    this.consume().catch((error) => {
      console.error(
        JSON.stringify({
          level: "error",
          service: "message-persistence-worker",
          message: error.message,
        })
      );
      process.exitCode = 1;
    });
    return this;
  }

  async consume() {
    while (this.running) {
      const batches = await this.redis.xreadgroup(
        "GROUP",
        consumerGroup,
        this.consumerName,
        "COUNT",
        20,
        "BLOCK",
        5000,
        "STREAMS",
        streamKey,
        ">"
      );
      if (!batches) continue;
      for (const [, entries] of batches) {
        for (const [streamId, fields] of entries) {
          await this.process(streamId, fieldsToObject(fields));
        }
      }
    }
  }

  async process(streamId, event) {
    try {
      const message = await persistMessage({
        eventId: event.eventId,
        senderId: event.senderId,
        chatId: event.chatId,
        content: event.content,
      });
      await this.redis
        .multi()
        .set(
          resultKey(event.eventId),
          JSON.stringify({ ok: true, message: message.toJSON() }),
          "EX",
          resultTtlSeconds
        )
        .xack(streamKey, consumerGroup, streamId)
        .exec();
    } catch (error) {
      await this.redis
        .multi()
        .xadd(
          deadLetterStreamKey,
          "MAXLEN",
          "~",
          10000,
          "*",
          "sourceStreamId",
          streamId,
          "eventId",
          event.eventId || "",
          "payload",
          JSON.stringify(event),
          "error",
          error.message,
          "failedAt",
          new Date().toISOString()
        )
        .set(
          resultKey(event.eventId),
          JSON.stringify({
            ok: false,
            message: error.message,
            statusCode: error.statusCode || 500,
          }),
          "EX",
          resultTtlSeconds
        )
        .xack(streamKey, consumerGroup, streamId)
        .exec();
    }
  }

  async status() {
    const groups = await this.redis.xinfo("GROUPS", streamKey);
    return {
      stream: streamKey,
      group: consumerGroup,
      consumer: this.consumerName,
      groups,
    };
  }

  async close() {
    this.running = false;
    await closeRedis(this.redis);
  }
}

let producer;
const getMessageStreamProducer = async () => {
  if (!producer) {
    producer = await new MessageStreamProducer().connect();
  }
  return producer;
};

const closeMessageStreamProducer = async () => {
  if (!producer) return;
  await producer.close();
  producer = null;
};

module.exports = {
  closeMessageStreamProducer,
  MessageStreamProducer,
  MessageStreamWorker,
  getMessageStreamProducer,
  streamKey,
};
