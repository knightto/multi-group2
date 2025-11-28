
const express = require('express');
const router = express.Router();
const Event = require('../models/Event');
const TeeTime = require('../models/TeeTime');
const Team = require('../models/Team');
const Group = require('../models/Group');

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
    if (startType !== undefined) event.startType = startType;
    if (Array.isArray(teeTimes)) event.teeTimes = teeTimes;
    if (Array.isArray(teams)) event.teams = teams;
    if (isActive !== undefined) event.isActive = isActive;

    await event.save();
    res.json(event);
  } catch (err) {
    console.error('PUT /api/events/:eventId error', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get all upcoming active events for a group (public)
// Now returns events with embedded teeTimes and teams (no longer using separate collections)
router.get('/group/:groupId', async (req, res) => {
  try {
    const groupId = req.params.groupId;

    const group = await Group.findById(groupId);
    if (!group || group.isArchived) {
      return res.status(404).json({ error: 'Group not found' });
    }

    const now = new Date();
    const events = await Event.find({
      groupId,
      isActive: true,
      date: { $gte: now }
    }).sort('date');

    // Return events as-is; teeTimes and teams are now embedded
    res.json(events);
  } catch (err) {
    console.error('GET /api/events/group/:groupId error', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create event (group admin – using global ADMIN_CODE for now)
// Now supports embedded teeTimes and teams in the request body
router.post('/group/:groupId', async (req, res) => {
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
      teams
    } = req.body;

    if (!checkAdminCode(adminCode)) {
      return res.status(403).json({ error: 'Invalid admin code' });
    }

    const groupId = req.params.groupId;

    const group = await Group.findById(groupId);
    if (!group || group.isArchived) {
      return res.status(404).json({ error: 'Group not found' });
    }

    if (!name || !date || !type) {
      return res
        .status(400)
        .json({ error: 'name, date and type are required' });
    }

    if (!['teeTime', 'team'].includes(type)) {
      return res.status(400).json({ error: 'Invalid event type' });
    }

    const event = new Event({
      groupId,
      name,
      date: new Date(date),
      type,
      description,
      maxPlayers: maxPlayers ? Number(maxPlayers) : undefined,
      teamSize: teamSize ? Number(teamSize) : undefined,
      startType,
      isActive: true,
      teeTimes: Array.isArray(teeTimes) ? teeTimes : [],
      teams: Array.isArray(teams) ? teams : []
    });

    await event.save();
    res.status(201).json(event);
  } catch (err) {
    console.error('POST /api/events/group/:groupId error', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get all tee times for an event (public)
router.get('/:eventId/teetimes', async (req, res) => {
  try {
    const eventId = req.params.eventId;

    const event = await Event.findById(eventId);
    if (!event || !event.isActive) {
      return res.status(404).json({ error: 'Event not found' });
    }

    const teeTimes = await TeeTime.find({ eventId }).sort('time');
    res.json(teeTimes);
  } catch (err) {
    console.error('GET /api/events/:eventId/teetimes error', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get all teams for an event (public)
router.get('/:eventId/teams', async (req, res) => {
  try {
    const eventId = req.params.eventId;

    const event = await Event.findById(eventId);
    if (!event || !event.isActive) {
      return res.status(404).json({ error: 'Event not found' });
    }

    const teams = await Team.find({ eventId }).sort('name');
    res.json(teams);
  } catch (err) {
    console.error('GET /api/events/:eventId/teams error', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Player signup for tee time (public, embedded model)
router.post('/:eventId/teetimes/:teeTimeIdx/signup', async (req, res) => {
  try {
    const { name, email } = req.body;
    if (!name || !email) {
      return res.status(400).json({ error: 'name and email are required' });
    }

    const eventId = req.params.eventId;
    const teeTimeIdx = parseInt(req.params.teeTimeIdx, 10);

    const event = await Event.findById(eventId);
    if (!event || !event.isActive) {
      return res.status(404).json({ error: 'Event not found' });
    }
    if (!event.teeTimes || !event.teeTimes[teeTimeIdx]) {
      return res.status(404).json({ error: 'Tee time not found' });
    }
    const teeTime = event.teeTimes[teeTimeIdx];
    if (teeTime.slots.some(p => p.email === email)) {
      return res.status(400).json({ error: 'Player already in tee time' });
    }
    if (teeTime.slots.length >= teeTime.maxPlayers) {
      return res.status(400).json({ error: 'Tee time is full' });
    }
    teeTime.slots.push({ name, email });
    event.markModified('teeTimes');
    await event.save();
    res.json({ success: true, teeTime });
  } catch (err) {
    console.error('POST /api/events/:eventId/teetimes/:teeTimeIdx/signup error', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Player remove from tee time (public, embedded model)
router.post('/:eventId/teetimes/:teeTimeIdx/remove', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'email is required' });
    }
    const eventId = req.params.eventId;
    const teeTimeIdx = parseInt(req.params.teeTimeIdx, 10);
    const event = await Event.findById(eventId);
    if (!event || !event.isActive) {
      return res.status(404).json({ error: 'Event not found' });
    }
    if (!event.teeTimes || !event.teeTimes[teeTimeIdx]) {
      return res.status(404).json({ error: 'Tee time not found' });
    }
    const teeTime = event.teeTimes[teeTimeIdx];
    const before = teeTime.slots.length;
    teeTime.slots = teeTime.slots.filter(p => p.email !== email);
    if (teeTime.slots.length === before) {
      return res.status(404).json({ error: 'Player not found in this tee time' });
    }
    event.markModified('teeTimes');
    await event.save();
    res.json({ success: true, teeTime });
  } catch (err) {
    console.error('POST /api/events/:eventId/teetimes/:teeTimeIdx/remove error', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Player signup for team (public, embedded model)
router.post('/:eventId/teams/:teamIdx/signup', async (req, res) => {
  try {
    const { name, email } = req.body;
    if (!name || !email) {
      return res.status(400).json({ error: 'name and email are required' });
    }
    const eventId = req.params.eventId;
    const teamIdx = parseInt(req.params.teamIdx, 10);
    const event = await Event.findById(eventId);
    if (!event || !event.isActive) {
      return res.status(404).json({ error: 'Event not found' });
    }
    if (!event.teams || !event.teams[teamIdx]) {
      return res.status(404).json({ error: 'Team not found' });
    }
    const team = event.teams[teamIdx];
    if (team.players.some(p => p.email === email)) {
      return res.status(400).json({ error: 'Player already in team' });
    }
    if (team.players.length >= team.maxPlayers) {
      return res.status(400).json({ error: 'Team is full' });
    }
    team.players.push({ name, email });
    event.markModified('teams');
    await event.save();
    res.json({ success: true, team });
  } catch (err) {
    console.error('POST /api/events/:eventId/teams/:teamIdx/signup error', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Player remove from team (public, embedded model)
router.post('/:eventId/teams/:teamIdx/remove', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'email is required' });
    }
    const eventId = req.params.eventId;
    const teamIdx = parseInt(req.params.teamIdx, 10);
    const event = await Event.findById(eventId);
    if (!event || !event.isActive) {
      return res.status(404).json({ error: 'Event not found' });
    }
    if (!event.teams || !event.teams[teamIdx]) {
      return res.status(404).json({ error: 'Team not found' });
    }
    const team = event.teams[teamIdx];
    const before = team.players.length;
    team.players = team.players.filter(p => p.email !== email);
    if (team.players.length === before) {
      return res.status(404).json({ error: 'Player not found in team' });
    }
    event.markModified('teams');
    await event.save();
    res.json({ success: true, team });
  } catch (err) {
    console.error('POST /api/events/:eventId/teams/:teamIdx/remove error', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
