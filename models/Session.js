const mongoose = require('mongoose');

const SessionSchema = new mongoose.Schema({
  roomId: { type: String, required: true },
  user1: { type: String, required: true },
  user2: { type: String, required: true },
  type: { type: String, required: true },
  startTime: { type: Number, required: true },
  endTime: { type: Number },
  chatLogs: { type: Array, default: [] },
  snapshots: { type: Object, default: {} },
  createdAt: { type: Date, default: Date.now, expires: 86400 } // Auto-expires sessions after 24 hours
});

module.exports = mongoose.model('Session', SessionSchema);
