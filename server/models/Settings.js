const mongoose = require('mongoose');

const SettingsSchema = new mongoose.Schema({
  groupId: { type: mongoose.Schema.Types.ObjectId, ref: 'Group', required: true, unique: true },
  notificationsEnabled: { type: Boolean, default: true },
  weatherEnabled: { type: Boolean, default: false },
  // Add more per-group settings as needed
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

SettingsSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Settings', SettingsSchema);
