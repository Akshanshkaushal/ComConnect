const express = require("express");
const {
  applyWorkspaceTaskPlan,
  askWorkspaceAssistant,
  createWorkspaceTaskPlan,
  syncWorkspaceKnowledge,
} = require("../controllers/aiControllers");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.use(protect);
router.post("/workspaces/:workspaceId/sync", syncWorkspaceKnowledge);
router.post("/workspaces/:workspaceId/ask", askWorkspaceAssistant);
router.post("/workspaces/:workspaceId/task-plan", createWorkspaceTaskPlan);
router.post("/workspaces/:workspaceId/task-plan/apply", applyWorkspaceTaskPlan);

module.exports = router;
