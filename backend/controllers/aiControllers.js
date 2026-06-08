const asyncHandler = require("express-async-handler");
const jwt = require("jsonwebtoken");

const Chat = require("../models/chatModel");
const Message = require("../models/messageModel");
const Task = require("../models/taskModel");
const {
  askWorkspace,
  coordinateEvent,
  indexWorkspace,
  planTasks,
  summarizeChat,
} = require("../services/aiServiceClient");
const { getWorkspaceForMember } = require("../services/workspaceAccessService");
const { buildWorkspaceDocuments } = require("../services/workspaceKnowledgeService");

const indexedFingerprints = new Map();

const syncWorkspace = async (workspace, force = false) => {
  const workspaceId = workspace._id.toString();
  const { documents, fingerprint } = await buildWorkspaceDocuments(workspace);
  if (!force && indexedFingerprints.get(workspaceId) === fingerprint) {
    return { indexed: documents.length, unchanged: true };
  }
  const result = await indexWorkspace(workspaceId, documents);
  indexedFingerprints.set(workspaceId, fingerprint);
  return result;
};

const syncWorkspaceKnowledge = asyncHandler(async (req, res) => {
  const workspace = await getWorkspaceForMember(req.params.workspaceId, req.user._id);
  const result = await syncWorkspace(workspace, true);
  res.json(result);
});

const askWorkspaceAssistant = asyncHandler(async (req, res) => {
  const question = req.body.question?.trim();
  if (!question) {
    res.status(400);
    throw new Error("question is required");
  }

  const workspace = await getWorkspaceForMember(req.params.workspaceId, req.user._id);
  await syncWorkspace(workspace);
  const result = await askWorkspace(workspace._id.toString(), question);
  res.json(result);
});

const summarizeGroupChat = asyncHandler(async (req, res) => {
  const chat = await Chat.findById(req.params.chatId)
    .populate("users", "name email")
    .lean();

  if (!chat) {
    res.status(404);
    throw new Error("Chat not found");
  }
  if (!chat.users.some((chatUser) => chatUser._id.toString() === req.user._id.toString())) {
    res.status(403);
    throw new Error("You do not have access to this chat");
  }
  if (!chat.isGroupChat) {
    res.status(400);
    throw new Error("Chat summarizer is available for group chats");
  }

  const messages = await Message.find({ chat: chat._id })
    .sort({ createdAt: -1 })
    .limit(200)
    .populate("sender", "name email")
    .lean();

  if (!messages.length) {
    res.status(400);
    throw new Error("No chat messages available to summarize");
  }

  const result = await summarizeChat(
    chat.chatName,
    [...messages].reverse().map((message) => ({
      sender: message.sender?.name || "Unknown",
      content: message.content,
      created_at: message.createdAt?.toISOString(),
    }))
  );
  res.json(result);
});

const coordinateWorkspaceEvent = asyncHandler(async (req, res) => {
  const question =
    req.body.question?.trim() || "Are we ready for the event? What is blocked?";

  const workspace = await getWorkspaceForMember(req.params.workspaceId, req.user._id);
  await syncWorkspace(workspace);
  const result = await coordinateEvent(
    workspace._id.toString(),
    question,
    workspace.users.map(({ name, email }) => ({ name, email }))
  );
  res.json(result);
});

const createWorkspaceTaskPlan = asyncHandler(async (req, res) => {
  const request = req.body.request?.trim();
  if (!request) {
    res.status(400);
    throw new Error("request is required");
  }

  const workspace = await getWorkspaceForMember(req.params.workspaceId, req.user._id);
  await syncWorkspace(workspace);
  const result = await planTasks(
    workspace._id.toString(),
    request,
    workspace.users.map(({ name, email }) => ({ name, email }))
  );

  const tasks = result.plan.tasks.map((task) => ({
    heading: task.heading.trim(),
    description: task.description.trim(),
    assigneeEmail: task.assignee_email || task.assigneeEmail || req.user.email,
    priority: task.priority || "medium",
  }));
  const approvalToken = jwt.sign(
    {
      purpose: "apply-ai-task-plan",
      workspaceId: workspace._id.toString(),
      userId: req.user._id.toString(),
      tasks,
    },
    process.env.JWT_SECRET,
    { expiresIn: "30m" }
  );

  res.json({
    plan: { ...result.plan, tasks },
    sources: result.sources,
    approvalToken,
  });
});

const applyWorkspaceTaskPlan = asyncHandler(async (req, res) => {
  let approvedPlan;
  try {
    approvedPlan = jwt.verify(req.body.approvalToken, process.env.JWT_SECRET);
  } catch {
    res.status(400);
    throw new Error("Task plan approval is invalid or expired");
  }

  if (
    approvedPlan.purpose !== "apply-ai-task-plan" ||
    approvedPlan.workspaceId !== req.params.workspaceId ||
    approvedPlan.userId !== req.user._id.toString()
  ) {
    res.status(403);
    throw new Error("Task plan approval does not match this request");
  }

  if (!Array.isArray(approvedPlan.tasks) || approvedPlan.tasks.length > 20) {
    res.status(400);
    throw new Error("Task plan must contain between 1 and 20 tasks");
  }

  const workspace = await getWorkspaceForMember(req.params.workspaceId, req.user._id);
  const usersByEmail = new Map(workspace.users.map((user) => [user.email, user]));
  const invalidAssignees = approvedPlan.tasks
    .filter((task) => !usersByEmail.has(task.assigneeEmail))
    .map((task) => task.assigneeEmail);

  if (invalidAssignees.length) {
    res.status(400);
    throw new Error(`Invalid workspace assignees: ${invalidAssignees.join(", ")}`);
  }

  const tasks = await Task.insertMany(
    approvedPlan.tasks.map((task) => ({
      heading: task.heading,
      description: task.description,
      assignee: usersByEmail.get(task.assigneeEmail)._id,
      workspace: workspace._id,
      priority: task.priority,
      createdBy: req.user._id,
    }))
  );
  res.status(201).json({ created: tasks.length, tasks });
});

module.exports = {
  applyWorkspaceTaskPlan,
  askWorkspaceAssistant,
  coordinateWorkspaceEvent,
  createWorkspaceTaskPlan,
  summarizeGroupChat,
  syncWorkspaceKnowledge,
};
