const mongoose = require('mongoose');

const TeamSchema = new mongoose.Schema({
  eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
  name: { type: String, required: true },
  players: [{
    name: String,
    email: String,
    joinedAt: { type: Date, default: Date.now }
  }],
  maxPlayers: { type: Number, required: true },
});

module.exports = mongoose.model('Team', TeamSchema);
