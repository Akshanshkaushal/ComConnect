const asyncHandler = require("express-async-handler");
const Chat = require("../models/chatModel");
const Message = require("../models/messageModel");
const User = require("../models/userModel");
const { queueChatNotifications } = require("../services/notificationClient");

const allMessages = asyncHandler(async (req, res) => {
  const messages = await Message.find({ chat: req.params.chatId })
    .populate("sender", "name pic email")
    .populate("chat");
  res.json(messages);
});

const sendMessage = asyncHandler(async (req, res) => {
  const { content, chatId } = req.body;
  if (!content?.trim() || !chatId) {
    res.status(400);
    throw new Error("content and chatId are required");
  }

  let message = await Message.create({
    sender: req.user._id,
    content: content.trim(),
    chat: chatId,
  });
  message = await message.populate("sender", "name pic");
  message = await message.populate("chat");
  message = await User.populate(message, {
    path: "chat.users",
    select: "name pic email",
  });

  await Chat.findByIdAndUpdate(chatId, { latestMessage: message });

  const recipients = message.chat.users
    .filter((user) => user._id.toString() !== req.user._id.toString())
    .map((user) => user._id.toString());

  queueChatNotifications({
    recipients,
    title: message.chat.isGroupChat
      ? `New message in ${message.chat.chatName}`
      : `New message from ${message.sender.name}`,
    body: message.content,
    data: {
      type: "new_message",
      chatId: chatId.toString(),
      messageId: message._id.toString(),
      senderId: message.sender._id.toString(),
      senderName: message.sender.name,
      isGroupChat: message.chat.isGroupChat.toString(),
      chatName: message.chat.chatName || "",
      timestamp: new Date().toISOString(),
    },
  }).catch((error) => {
    console.error("Unable to queue chat notifications:", error.message);
  });

  res.status(201).json(message);
});

module.exports = { allMessages, sendMessage };
