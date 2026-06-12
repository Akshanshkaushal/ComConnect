const express = require('express');
const { createWorkspace, addRole, joinWorkspace, getRoles, getUserWorkspaces, getGroups } = require('../controllers/workspaceControllers');
const { protect } = require('../middleware/authMiddleware');
const { searchWorkspaceHistory } = require("../controllers/workspaceSearchController");

const router = express.Router();

router.post('/', protect, createWorkspace);
router.route('/:id/role').post(protect, addRole);
router.get('/:id/roles',protect,getRoles);

router.post('/join', protect, joinWorkspace);
router.route('/user').get(protect, getUserWorkspaces);
router.get('/:id/search', protect, searchWorkspaceHistory);
router.get('/:id/groups', protect, getGroups);

module.exports = router;
