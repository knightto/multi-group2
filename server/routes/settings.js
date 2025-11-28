const express = require('express');
const router = express.Router();
const Settings = require('../models/Settings');
const Group = require('../models/Group');

function checkAdminCode(code) {
  return code && code === process.env.ADMIN_CODE;
}

// Get settings for a group
router.get('/:groupId', async (req, res) => {
  try {
    const groupId = req.params.groupId;
    const settings = await Settings.findOne({ groupId });
    if (!settings) {
      return res.status(404).json({ error: 'Settings not found' });
    }
    res.json(settings);
  } catch (err) {
    console.error('GET /api/settings/:groupId error', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create or update settings for a group (admin only)
router.post('/:groupId', async (req, res) => {
  try {
    const { adminCode, notificationsEnabled, weatherEnabled } = req.body;
    if (!checkAdminCode(adminCode)) {
      return res.status(403).json({ error: 'Invalid admin code' });
    }
    const groupId = req.params.groupId;
    const group = await Group.findById(groupId);
    if (!group || group.isArchived) {
      return res.status(404).json({ error: 'Group not found' });
    }
    let settings = await Settings.findOne({ groupId });
    if (!settings) {
      settings = new Settings({ groupId });
    }
    if (typeof notificationsEnabled === 'boolean') settings.notificationsEnabled = notificationsEnabled;
    if (typeof weatherEnabled === 'boolean') settings.weatherEnabled = weatherEnabled;
    await settings.save();
    res.json(settings);
  } catch (err) {
    console.error('POST /api/settings/:groupId error', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
