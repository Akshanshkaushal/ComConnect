const Workspace = require("../models/workspaceModel");

const getWorkspaceForMember = async (workspaceId, userId) => {
  const workspace = await Workspace.findOne({
    _id: workspaceId,
    users: userId,
  }).populate("users", "name email");

  if (!workspace) {
    const error = new Error("Workspace not found or access denied");
    error.statusCode = 404;
    throw error;
  }

  return workspace;
};

module.exports = { getWorkspaceForMember };
