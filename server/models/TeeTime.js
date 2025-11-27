const mongoose = require('mongoose');

const TeeTimeSchema = new mongoose.Schema({
  eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
  time: { type: String, required: true }, // e.g. '08:00'
  players: [{
    name: String,
    email: String,
    joinedAt: { type: Date, default: Date.now }
  }],
  maxPlayers: { type: Number, required: true },
});

module.exports = mongoose.model('TeeTime', TeeTimeSchema);
