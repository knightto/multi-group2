const mongoose = require('mongoose');

const GlobalSettingSchema = new mongoose.Schema({
  notificationsEnabled: { type: Boolean, default: true },
  defaultReminderTime: { type: Number, default: 24 }, // hours before event
});

module.exports = mongoose.model('GlobalSetting', GlobalSettingSchema);
