const express = require('express');
const router = express.Router();
const Event = require('../models/Event');
const TeeTime = require('../models/TeeTime');
const Team = require('../models/Team');
const Group = require('../models/Group');

function checkAdminCode(code) {
  return code && code === process.env.ADMIN_CODE;
}

// Get all upcoming active events for a group (public)
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

    res.json(events);
  } catch (err) {
    console.error('GET /api/events/group/:groupId error', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create event (group admin – using global ADMIN_CODE for now)
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
      startType
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
      isActive: true
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

// Player signup for tee time (public)
router.post('/:eventId/teetimes/:teeTimeId/signup', async (req, res) => {
  try {
    const { name, email } = req.body;
    if (!name || !email) {
      return res.status(400).json({ error: 'name and email are required' });
    }

    const eventId = req.params.eventId;
    const teeTimeId = req.params.teeTimeId;

    const event = await Event.findById(eventId);
    if (!event || !event.isActive) {
      return res.status(404).json({ error: 'Event not found' });
    }

    const teeTime = await TeeTime.findOne({ _id: teeTimeId, eventId });
    if (!teeTime) {
      return res.status(404).json({ error: 'Tee time not found' });
    }

    if (teeTime.players.some(p => p.email === email)) {
      return res.status(400).json({ error: 'Player already in tee time' });
    }

    if (teeTime.players.length >= teeTime.maxPlayers) {
      return res.status(400).json({ error: 'Tee time is full' });
    }

    teeTime.players.push({ name, email });
    await teeTime.save();

    res.json({ success: true, teeTime });
  } catch (err) {
    console.error(
      'POST /api/events/:eventId/teetimes/:teeTimeId/signup error',
      err
    );
    res.status(500).json({ error: 'Server error' });
  }
});

// Player remove from tee time (public)
router.post('/:eventId/teetimes/:teeTimeId/remove', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'email is required' });
    }

    const eventId = req.params.eventId;
    const teeTimeId = req.params.teeTimeId;

    const teeTime = await TeeTime.findOne({ _id: teeTimeId, eventId });
    if (!teeTime) {
      return res.status(404).json({ error: 'Tee time not found' });
    }

    const before = teeTime.players.length;
    teeTime.players = teeTime.players.filter(p => p.email !== email);

    if (teeTime.players.length === before) {
      return res
        .status(404)
        .json({ error: 'Player not found in this tee time' });
    }

    await teeTime.save();
    res.json({ success: true, teeTime });
  } catch (err) {
    console.error(
      'POST /api/events/:eventId/teetimes/:teeTimeId/remove error',
      err
    );
    res.status(500).json({ error: 'Server error' });
  }
});

// Player signup for team (public)
router.post('/:eventId/teams/:teamId/signup', async (req, res) => {
  try {
    const { name, email } = req.body;
    if (!name || !email) {
      return res.status(400).json({ error: 'name and email are required' });
    }

    const eventId = req.params.eventId;
    const teamId = req.params.teamId;

    const event = await Event.findById(eventId);
    if (!event || !event.isActive) {
      return res.status(404).json({ error: 'Event not found' });
    }

    const team = await Team.findOne({ _id: teamId, eventId });
    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }

    if (team.players.some(p => p.email === email)) {
      return res.status(400).json({ error: 'Player already in team' });
    }

    if (team.players.length >= team.maxPlayers) {
      return res.status(400).json({ error: 'Team is full' });
    }

    team.players.push({ name, email });
    await team.save();

    res.json({ success: true, team });
  } catch (err) {
    console.error(
      'POST /api/events/:eventId/teams/:teamId/signup error',
      err
    );
    res.status(500).json({ error: 'Server error' });
  }
});

// Player remove from team (public)
router.post('/:eventId/teams/:teamId/remove', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'email is required' });
    }

    const eventId = req.params.eventId;
    const teamId = req.params.teamId;

    const team = await Team.findOne({ _id: teamId, eventId });
    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }

    const before = team.players.length;
    team.players = team.players.filter(p => p.email !== email);

    if (team.players.length === before) {
      return res.status(404).json({ error: 'Player not found in team' });
    }

    await team.save();
    res.json({ success: true, team });
  } catch (err) {
    console.error(
      'POST /api/events/:eventId/teams/:teamId/remove error',
      err
    );
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
