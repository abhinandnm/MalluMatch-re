const mongoose = require('mongoose');

const ChatLogSchema = new mongoose.Schema({
  roomId: { type: String, required: true },
  sender: { type: String, required: true },
  ip: String,
  text: { type: String, required: true },
  time: String,
  timestamp: { type: Date, default: Date.now, expires: 86400 } // 24-hour expiration (TTL)
});

module.exports = mongoose.model('ChatLog', ChatLogSchema);
