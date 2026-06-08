const express = require("express");
const {
  applyWorkspaceTaskPlan,
  askWorkspaceAssistant,
  coordinateWorkspaceEvent,
  createWorkspaceTaskPlan,
  summarizeGroupChat,
  syncWorkspaceKnowledge,
} = require("../controllers/aiControllers");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.use(protect);
router.post("/workspaces/:workspaceId/sync", syncWorkspaceKnowledge);
router.post("/workspaces/:workspaceId/ask", askWorkspaceAssistant);
router.post("/workspaces/:workspaceId/task-plan", createWorkspaceTaskPlan);
router.post("/workspaces/:workspaceId/task-plan/apply", applyWorkspaceTaskPlan);
router.post("/workspaces/:workspaceId/event-coordinator", coordinateWorkspaceEvent);
router.post("/chats/:chatId/summary", summarizeGroupChat);

module.exports = router;
