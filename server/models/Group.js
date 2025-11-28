const mongoose = require('mongoose');

const GroupSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String },
  template: { type: String, enum: ['default', 'golf', 'social'], default: 'golf' },
  accessCode: { type: String, required: true, unique: true },
  logoUrl: { type: String },
  isActive: { type: Boolean, default: true },
  isArchived: { type: Boolean, default: false }, // soft delete
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

GroupSchema.pre('save', function() {
  this.updatedAt = Date.now();
});

module.exports = mongoose.model('Group', GroupSchema);
