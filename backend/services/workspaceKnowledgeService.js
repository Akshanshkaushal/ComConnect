const Chat = require("../models/chatModel");
const crypto = require("crypto");
const Message = require("../models/messageModel");
const Task = require("../models/taskModel");

const buildWorkspaceDocuments = async (workspace) => {
  const chats = await Chat.find({ workspace: workspace._id }).select("_id chatName");
  const chatNames = new Map(chats.map((chat) => [chat._id.toString(), chat.chatName]));
  const chatIds = chats.map((chat) => chat._id);

  const [messages, tasks] = await Promise.all([
    Message.find({ chat: { $in: chatIds } })
      .sort({ createdAt: -1 })
      .limit(1000)
      .populate("sender", "name")
      .lean(),
    Task.find({ workspace: workspace._id })
      .sort({ updatedAt: -1 })
      .limit(500)
      .populate("assignee createdBy comments.user", "name email")
      .lean(),
  ]);

  const messageDocuments = messages.map((message) => ({
    id: `message-${message._id}`,
    content: `${message.sender?.name || "Unknown"} in ${
      chatNames.get(message.chat.toString()) || "chat"
    } at ${message.createdAt.toISOString()}: ${message.content}`,
    metadata: {
      type: "message",
      label: chatNames.get(message.chat.toString()) || "Chat message",
      source_id: message._id.toString(),
    },
  }));

  const taskDocuments = tasks.map((task) => ({
    id: `task-${task._id}`,
    content: [
      `Task: ${task.heading}`,
      `Description: ${task.description}`,
      `Status: ${task.status}`,
      `Assignee: ${task.assignee?.name || "Unknown"} <${task.assignee?.email || ""}>`,
      `Comments: ${task.comments
        .map((comment) => `${comment.user?.name || "Unknown"}: ${comment.comment}`)
        .join(" | ") || "None"}`,
    ].join("\n"),
    metadata: {
      type: "task",
      label: task.heading,
      source_id: task._id.toString(),
    },
  }));

  const documents = [
    {
      id: `workspace-${workspace._id}`,
      content: `Workspace: ${workspace.workspaceName}\nRoles: ${workspace.roles
        .map((role) => role.roleName)
        .join(", ")}`,
      metadata: {
        type: "workspace",
        label: workspace.workspaceName,
        source_id: workspace._id.toString(),
      },
    },
    ...messageDocuments,
    ...taskDocuments,
  ];
  const fingerprint = crypto
    .createHash("sha256")
    .update(documents.map((document) => `${document.id}:${document.content}`).join("\n"))
    .digest("hex");

  return { documents, fingerprint };
};

module.exports = { buildWorkspaceDocuments };
