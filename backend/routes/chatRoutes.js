const express = require("express");
const {
  accessChat,
  fetchChats,
  createGroupChat,
  removeFromGroup,
  addToGroup,
  renameGroup,
  transferGroupAdmin,
} = require("../controllers/chatControllers");
const { protect } = require("../middleware/authMiddleware");
const {
  getUserPresence,
  getUsersPresence,
} = require("../controllers/presenceController");

const router = express.Router();

router.route("/").post(protect, accessChat);
router.post("/presence", protect, getUsersPresence);
router.get("/presence/:userId", protect, getUserPresence);
router.get('/workspace/:workspaceId/chats',protect, fetchChats);
router.route("/group").post(protect, createGroupChat);
router.route("/rename").put(protect, renameGroup).patch(protect, renameGroup);
router
  .route("/groupremove")
  .put(protect, removeFromGroup)
  .patch(protect, removeFromGroup);
router.route("/groupadd").put(protect, addToGroup).patch(protect, addToGroup);
router.route("/groupadmin").patch(protect, transferGroupAdmin);

module.exports = router;
