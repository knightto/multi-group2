const mongoose = require('mongoose');

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
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

EventSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Event', EventSchema);
