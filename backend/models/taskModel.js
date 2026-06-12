const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
  heading: { type: String, required: true },
  description: { type: String, required: true },
  assignee: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  workspace: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace', index: true },
  status: { type: String, default: 'to-do' },
  priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
  tags: { type: [String], default: [], index: true },
  comments: [{ user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, comment: String }],
  attachments: { type: [String], default: [] },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

module.exports = mongoose.model('Task', taskSchema);
