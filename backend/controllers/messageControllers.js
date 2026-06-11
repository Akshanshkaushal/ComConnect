const asyncHandler = require("express-async-handler");
const Message = require("../models/messageModel");
const { getMessageStreamProducer } = require("../services/messageStreamService");

const allMessages = asyncHandler(async (req, res) => {
  const messages = await Message.find({ chat: req.params.chatId })
    .populate("sender", "name pic email")
    .populate("chat")
    .sort({ createdAt: 1 });
  res.json(messages);
});

const sendMessage = asyncHandler(async (req, res) => {
  const { content, chatId } = req.body;
  if (!content?.trim() || !chatId) {
    res.status(400);
    throw new Error("content and chatId are required");
  }

  const producer = await getMessageStreamProducer();
  const message = await producer.enqueue({
    senderId: req.user._id,
    content: content.trim(),
    chatId,
    requestId: req.requestId,
  });
  res.status(201).json(message);
});

module.exports = { allMessages, sendMessage };
