const asyncHandler = require("express-async-handler");
const { getPresenceService } = require("../services/presenceService");

const getUserPresence = asyncHandler(async (req, res) => {
  const presence = await getPresenceService();
  res.json(await presence.get(req.params.userId));
});

const getUsersPresence = asyncHandler(async (req, res) => {
  const userIds = Array.isArray(req.body.userIds) ? req.body.userIds : [];
  if (userIds.length === 0 || userIds.length > 100) {
    res.status(400);
    throw new Error("userIds must contain between 1 and 100 user IDs");
  }
  const presence = await getPresenceService();
  res.json(await presence.getMany(userIds.map(String)));
});

module.exports = { getUserPresence, getUsersPresence };
