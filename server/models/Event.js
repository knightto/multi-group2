const mongoose = require('mongoose');


const SlotSchema = new mongoose.Schema({
  name: { type: String },
  email: { type: String },
  joinedAt: { type: Date, default: Date.now }
}, { _id: false });

const TeeTimeSchema = new mongoose.Schema({
  time: { type: String, required: true }, // e.g. '08:00'
  slots: [SlotSchema],
  maxPlayers: { type: Number, required: true }
}, { _id: false });

const TeamSchema = new mongoose.Schema({
  name: { type: String, required: true },
  players: [SlotSchema],
  maxPlayers: { type: Number, required: true }
}, { _id: false });

const EventSchema = new mongoose.Schema({
  groupId: { type: mongoose.Schema.Types.ObjectId, ref: 'Group', required: true },
  name: { type: String, required: true },
  date: { type: Date, required: true },
  type: { type: String, enum: ['teeTime', 'team'], required: true },
  description: { type: String },
  maxPlayers: { type: Number }, // for teeTime
  teamSize: { type: Number }, // for team
  startType: { type: String },
  isActive: { type: Boolean, default: true },
  teeTimes: [TeeTimeSchema], // embedded teeTimes (new)
  teams: [TeamSchema], // embedded teams (new)
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

EventSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Event', EventSchema);
