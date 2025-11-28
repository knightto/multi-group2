const express = require('express');
const router = express.Router();

const events = require('../events');
const Event = require('../models/Event');
const Group = require('../models/Group');


// Add user to maybe/interested list for an event (public)
router.post('/:eventId/maybe', async (req, res) => {
  try {
    const maybeList = await events.addMaybe(req.params.eventId, req.body.name);
    res.json({ success: true, maybeList });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});


// Remove user from maybe/interested list for an event (public)
router.delete('/:eventId/maybe/:nameIdx', async (req, res) => {
  try {
    const idx = parseInt(req.params.nameIdx, 10);
    const maybeList = await events.removeMaybe(req.params.eventId, idx);
    res.json({ success: true, maybeList });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

function checkAdminCode(code) {
  return code && code === process.env.ADMIN_CODE;
}

// Edit event (admin only) — supports updating embedded teeTimes and teams
router.put('/:eventId', async (req, res) => {
  try {
    const {
      adminCode,
      name,
      date,
      type,
      description,
      maxPlayers,
      teamSize,
      startType,
      teeTimes,
      teams,
      isActive
    } = req.body;

    if (!checkAdminCode(adminCode)) {
      return res.status(403).json({ error: 'Invalid admin code' });
    }

    const eventId = req.params.eventId;
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    if (name !== undefined) event.name = name;
    if (date !== undefined) event.date = new Date(date);
    if (type !== undefined) event.type = type;
    if (description !== undefined) event.description = description;
    if (maxPlayers !== undefined) event.maxPlayers = maxPlayers;
    if (teamSize !== undefined) event.teamSize = teamSize;
    // Event routes removed
    if (Array.isArray(teeTimes)) event.teeTimes = teeTimes;
