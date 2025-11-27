const express = require('express');
const router = express.Router();
const GlobalSetting = require('../models/GlobalSetting');

// Get global settings (admin)
router.get('/', async (req, res) => {
  try {
    const { adminCode } = req.query;
    if (adminCode !== process.env.ADMIN_CODE) {
      return res.status(403).json({ error: 'Invalid admin code' });
    }

    let settings = await GlobalSetting.findOne();
    if (!settings) {
      settings = await GlobalSetting.create({});
    }

    res.json(settings);
  } catch (err) {
    console.error('GET /api/global-settings error', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update global settings (admin)
router.put('/', async (req, res) => {
  try {
    const { adminCode, ...update } = req.body;
    if (adminCode !== process.env.ADMIN_CODE) {
      return res.status(403).json({ error: 'Invalid admin code' });
    }

    let settings = await GlobalSetting.findOne();
    if (!settings) {
      settings = await GlobalSetting.create({});
    }

    Object.assign(settings, update);
    await settings.save();

    res.json(settings);
  } catch (err) {
    console.error('PUT /api/global-settings error', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
