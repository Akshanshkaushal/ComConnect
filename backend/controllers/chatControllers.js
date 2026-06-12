const asyncHandler = require("express-async-handler");
const Chat = require("../models/chatModel");
const User = require("../models/userModel");
const Workspace = require("../models/workspaceModel");

const populateGroupChat = (chatId) =>
  Chat.findById(chatId)
    .populate("users", "-password")
    .populate("groupAdmin", "-password");

const requireGroupAdmin = async (chatId, requesterId) => {
  const chat = await Chat.findById(chatId);

  if (!chat || !chat.isGroupChat) {
    const error = new Error("Group chat not found");
    error.statusCode = 404;
    throw error;
  }
  if (chat.groupAdmin?.toString() !== requesterId.toString()) {
    const error = new Error("Only the group admin can perform this action");
    error.statusCode = 403;
    throw error;
  }
  return chat;
};

const addUsersToWorkspace = async (workspaceId, userIds, channelName) => {
  if (!workspaceId || !userIds.length) return;

  await Promise.all([
    Workspace.updateOne(
      { _id: workspaceId },
      { $addToSet: { users: { $each: userIds } } }
    ),
    User.updateMany(
      { _id: { $in: userIds } },
      { $addToSet: { workspaces: workspaceId } }
    ),
  ]);

  if (channelName) {
    await Workspace.updateOne(
      { _id: workspaceId, "roles.roleName": channelName },
      { $addToSet: { "roles.$.users": { $each: userIds } } }
    );
  }
};

//@description     Create or fetch One to One Chat
//@route           POST /api/chat/
//@access          Protected
const accessChat = asyncHandler(async (req, res) => {
  const { userId, workspaceId } = req.body; // Include workspaceId in the request body

  if (!userId || !workspaceId) {
    console.log("UserId or WorkspaceId param not sent with request");
    return res.sendStatus(400);
  }

  var isChat = await Chat.find({
    isGroupChat: false,
    workspace: workspaceId, // Add workspaceId to the query
    $and: [
      { users: { $elemMatch: { $eq: req.user._id } } },
      { users: { $elemMatch: { $eq: userId } } },
    ],
  })
    .populate("users", "-password")
    .populate("latestMessage");

  isChat = await User.populate(isChat, {
    path: "latestMessage.sender",
    select: "name pic email",
  });

  if (isChat.length > 0) {
    res.send(isChat[0]);
  } else {
    var chatData = {
      chatName: "sender",
      isGroupChat: false,
      users: [req.user._id, userId],
      workspace: workspaceId, // Include workspaceId when creating a new chat
    };

    try {
      const createdChat = await Chat.create(chatData);
      const FullChat = await Chat.findOne({ _id: createdChat._id })
        .populate("users", "-password")
        .populate("workspace"); // Optionally populate workspace details

      res.status(200).json(FullChat);
    } catch (error) {
      res.status(400);
      throw new Error(error.message);
    }
  }
});

//@description     Fetch all chats for a user based upon workspace
//@route           GET /api/chat/
//@access          Protected
const fetchChats = asyncHandler(async (req, res) => {
  const { workspaceId } = req.params; // Assuming workspaceId is passed as a URL parameter

  try {
    Chat.find({ 
        users: { $elemMatch: { $eq: req.user._id } },
        workspace: workspaceId  // Filter chats by workspaceId
      })
      .populate("users", "-password")
      .populate("groupAdmin", "-password")
      .populate("latestMessage")
      .sort({ updatedAt: -1 })
      .then(async (results) => {
        results = await User.populate(results, {
          path: "latestMessage.sender",
          select: "name pic email",
        });
        res.status(200).send(results);
      });
  } catch (error) {
    res.status(400);
    throw new Error(error.message);
  }
});

//@description     Create New Group Chat
//@route           POST /api/chat/group
//@access          Protected
const createGroupChat = asyncHandler(async (req, res) => {
  const { users: usersJSON, name, workspaceId } = req.body;  

  if (!usersJSON || !name || !workspaceId) {
    return res.status(400).send({ message: "Please fill all the fields" });
  }

  let users;
  try {
    users = JSON.parse(usersJSON);
  } catch {
    return res.status(400).send({ message: "Invalid group member list" });
  }
  if (!Array.isArray(users)) {
    return res.status(400).send({ message: "Invalid group member list" });
  }

  if (users.length < 2) {
    return res
      .status(400)
      .send("More than 2 users are required to form a group chat");
  }

  const memberIds = [
    ...new Set([...users.map(String), req.user._id.toString()]),
  ];

  const workspace = await Workspace.findOne({
    _id: workspaceId,
    users: req.user._id,
  });
  if (!workspace) {
    return res.status(403).send({
      message: "You must belong to the workspace to create a group",
    });
  }
  const existingMemberCount = await User.countDocuments({
    _id: { $in: memberIds },
  });
  if (existingMemberCount !== memberIds.length) {
    return res.status(400).send({
      message: "One or more selected users no longer exist",
    });
  }

  try {
    const groupChat = await Chat.create({
      chatName: name,
      users: memberIds,
      isGroupChat: true,
      groupAdmin: req.user,
      workspace: workspaceId, // Associate group chat with the workspace
    });

    const fullGroupChat = await Chat.findOne({ _id: groupChat._id })
      .populate("users", "-password")
      .populate("groupAdmin", "-password");

    // Update workspace with the new group chat
    await Workspace.findByIdAndUpdate(workspaceId, {
      $addToSet: { groups: groupChat._id }
    });
    await addUsersToWorkspace(workspaceId, memberIds, name);

    res.status(200).json(fullGroupChat);
  } catch (error) {
    res.status(400).send(error.message);
  }
});


// @desc    Rename Group
// @route   PUT /api/chat/rename
// @access  Protected
const renameGroup = asyncHandler(async (req, res) => {
  const { chatId, chatName } = req.body;
  const normalizedName = chatName?.trim();
  const chat = await requireGroupAdmin(chatId, req.user._id);
  if (!normalizedName) {
    res.status(400);
    throw new Error("Group name is required");
  }

  // Check if the chat is a predefined group
  const predefinedGroupPattern = /^[0-9]+(\+[0-9]+)*$/; // Example pattern for predefined groups like "1", "1+2", "1+2+3"
  if (predefinedGroupPattern.test(chat.chatName)) {
    res.status(400);
    throw new Error("Cannot rename predefined groups created during workspace creation.");
  }

  // Update the chat name
  chat.chatName = normalizedName;
  await chat.save();
  res.json(await populateGroupChat(chat._id));
});

// @desc    Remove user from Group
// @route   PUT /api/chat/groupremove
// @access  Protected
const removeFromGroup = asyncHandler(async (req, res) => {
  const { chatId, userId } = req.body;
  const chat = await Chat.findById(chatId);

  if (!chat || !chat.isGroupChat) {
    res.status(404);
    throw new Error("Group chat not found");
  }

  const requesterIsAdmin =
    chat.groupAdmin?.toString() === req.user._id.toString();
  const requesterIsLeaving = userId === req.user._id.toString();
  if (!requesterIsAdmin && !requesterIsLeaving) {
    res.status(403);
    throw new Error("Only admins can remove users from the group");
  }
  if (chat.groupAdmin?.toString() === userId) {
    res.status(400);
    throw new Error("Transfer group admin before the current admin leaves");
  }

  const removed = await Chat.findByIdAndUpdate(
    chatId,
    {
      $pull: { users: userId },
    },
    {
      new: true,
    }
  )
    .populate("users", "-password")
    .populate("groupAdmin", "-password");

  if (!removed) {
    res.status(404);
    throw new Error("Chat Not Found");
  } else {
    res.json(removed);
  }
});

// @desc    Add user to Group / Leave
// @route   PUT /api/chat/groupadd
// @access  Protected
const addToGroup = asyncHandler(async (req, res) => {
  const { chatId, userId } = req.body;
  const chat = await requireGroupAdmin(chatId, req.user._id);
  const member = await User.findById(userId).select("_id");
  if (!member) {
    res.status(404);
    throw new Error("User not found");
  }

  await Chat.updateOne(
    { _id: chat._id },
    { $addToSet: { users: member._id } }
  );
  await addUsersToWorkspace(
    chat.workspace,
    [member._id],
    chat.chatName
  );

  res.json(await populateGroupChat(chat._id));
});

// @desc    Transfer group admin ownership
// @route   PATCH /api/chat/groupadmin
// @access  Protected
const transferGroupAdmin = asyncHandler(async (req, res) => {
  const { chatId, userId } = req.body;
  const chat = await requireGroupAdmin(chatId, req.user._id);

  if (!chat.users.some((memberId) => memberId.toString() === userId)) {
    res.status(400);
    throw new Error("The new admin must already belong to the group");
  }

  chat.groupAdmin = userId;
  await chat.save();
  res.json(await populateGroupChat(chat._id));
});

const deleteAllChats = asyncHandler(async (req, res) => {
  try {
    await Chat.deleteMany({});
    res.status(200).json({ message: 'All chats have been deleted successfully.' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete chats', error: error.message });
  }
});

module.exports = {
  accessChat,
  fetchChats,
  createGroupChat,
  renameGroup,
  addToGroup,
  removeFromGroup,
  transferGroupAdmin,
  deleteAllChats
};
