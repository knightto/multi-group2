const express = require('express');
const router = express.Router();
const Event = require('../models/Event');
// TeeTime and Team models are deprecated for event management. Use Event model only.
const Subscriber = require('../models/Subscriber');
const Group = require('../models/Group');

function checkAdminCode(code) {
  return code && code === process.env.ADMIN_CODE;
}

// --- Event Management (admin) ---

// List all active events for a group (admin)
router.get('/:groupId/events', async (req, res) => {
  try {
    const { adminCode } = req.query;
    if (!checkAdminCode(adminCode)) {
      return res.status(403).json({ error: 'Invalid admin code' });
    }

    const groupId = req.params.groupId;
    const group = await Group.findById(groupId);
    if (!group || group.isArchived) {
      return res.status(404).json({ error: 'Group not found' });
    }

    const events = await Event.find({
      groupId,
      isActive: true
    }).sort('date');

    res.json(events);
  } catch (err) {
    console.error('GET /api/group-admin/:groupId/events error', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete (soft-delete) event for a group (admin)
router.delete('/:groupId/events/:eventId', async (req, res) => {
  try {
    const { adminCode } = req.body;
    if (!checkAdminCode(adminCode)) {
      return res.status(403).json({ error: 'Invalid admin code' });
    }

    const groupId = req.params.groupId;
    const eventId = req.params.eventId;

    const event = await Event.findOne({ _id: eventId, groupId });
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    event.isActive = false;
    await event.save();


    // No need to clean up embedded teeTimes/teams; handled in Event model

    res.json({ success: true });
  } catch (err) {
    console.error(
      'DELETE /api/group-admin/:groupId/events/:eventId error',
      err
    );
    res.status(500).json({ error: 'Server error' });
  }
});

// Add tee times for an event (admin)
router.post('/:groupId/events/:eventId/teetimes', async (req, res) => {
  try {
    const { adminCode, teeTimes } = req.body;
    if (!checkAdminCode(adminCode)) {
      return res.status(403).json({ error: 'Invalid admin code' });
    }

    if (!Array.isArray(teeTimes) || teeTimes.length === 0) {
      return res.status(400).json({ error: 'teeTimes array is required' });
    }

    const groupId = req.params.groupId;
    const eventId = req.params.eventId;

    const event = await Event.findOne({ _id: eventId, groupId });
    if (!event || !event.isActive) {
      return res.status(404).json({ error: 'Event not found' });
    }

    const docs = await TeeTime.insertMany(
      teeTimes.map(tt => ({
        eventId,
        time: tt.time,
        maxPlayers: Number(tt.maxPlayers) || 4,
        players: []
      }))
    );

    res.status(201).json(docs);
  } catch (err) {
    console.error(
      'POST /api/group-admin/:groupId/events/:eventId/teetimes error',
      err
    );
    res.status(500).json({ error: 'Server error' });
  }
});

// Add teams for an event (admin)
router.post('/:groupId/events/:eventId/teams', async (req, res) => {
  try {
    const { adminCode, teams } = req.body;
    if (!checkAdminCode(adminCode)) {
      return res.status(403).json({ error: 'Invalid admin code' });
    }

    if (!Array.isArray(teams) || teams.length === 0) {
      return res.status(400).json({ error: 'teams array is required' });
    }

    const groupId = req.params.groupId;
    const eventId = req.params.eventId;

    const event = await Event.findOne({ _id: eventId, groupId });
    if (!event || !event.isActive) {
      return res.status(404).json({ error: 'Event not found' });
    }

    const docs = await Team.insertMany(
      teams.map(t => ({
        eventId,
        name: t.name,
        maxPlayers: Number(t.maxPlayers) || 4,
        players: []
      }))
    );

    res.status(201).json(docs);
  } catch (err) {
    console.error(
      'POST /api/group-admin/:groupId/events/:eventId/teams error',
      err
    );
    res.status(500).json({ error: 'Server error' });
  }
});

// Move player between tee times (admin)
router.post('/:groupId/events/:eventId/teetimes/move', async (req, res) => {
  try {
    const { adminCode, playerEmail, fromTeeTimeId, toTeeTimeId } = req.body;
    if (!checkAdminCode(adminCode)) {
      return res.status(403).json({ error: 'Invalid admin code' });
    }

    if (!playerEmail || !fromTeeTimeId || !toTeeTimeId) {
      return res.status(400).json({
        error: 'playerEmail, fromTeeTimeId and toTeeTimeId are required'
      });
    }

    const eventId = req.params.eventId;

    const from = await TeeTime.findOne({ _id: fromTeeTimeId, eventId });
    const to = await TeeTime.findOne({ _id: toTeeTimeId, eventId });

    if (!from || !to) {
      return res.status(404).json({
        error: 'Source or destination tee time not found'
      });
    }

    const idx = from.players.findIndex(p => p.email === playerEmail);
    if (idx === -1) {
      return res
        .status(404)
        .json({ error: 'Player not found in source tee time' });
    }

    if (to.players.length >= to.maxPlayers) {
      return res.status(400).json({ error: 'Destination tee time is full' });
    }

    const [player] = from.players.splice(idx, 1);
    to.players.push(player);

    await from.save();
    await to.save();

    res.json({ success: true });
  } catch (err) {
    console.error(
      'POST /api/group-admin/:groupId/events/:eventId/teetimes/move error',
      err
    );
    res.status(500).json({ error: 'Server error' });
  }
});

// Move player between teams (admin)
router.post('/:groupId/events/:eventId/teams/move', async (req, res) => {
  try {
    const { adminCode, playerEmail, fromTeamId, toTeamId } = req.body;
    if (!checkAdminCode(adminCode)) {
      return res.status(403).json({ error: 'Invalid admin code' });
    }

    if (!playerEmail || !fromTeamId || !toTeamId) {
      return res.status(400).json({
        error: 'playerEmail, fromTeamId and toTeamId are required'
      });
    }

    const eventId = req.params.eventId;

    const from = await Team.findOne({ _id: fromTeamId, eventId });
    const to = await Team.findOne({ _id: toTeamId, eventId });

    if (!from || !to) {
      return res.status(404).json({
        error: 'Source or destination team not found'
      });
    }

    const idx = from.players.findIndex(p => p.email === playerEmail);
    if (idx === -1) {
      return res
        .status(404)
        .json({ error: 'Player not found in source team' });
    }

    if (to.players.length >= to.maxPlayers) {
      return res.status(400).json({ error: 'Destination team is full' });
    }

    const [player] = from.players.splice(idx, 1);
    to.players.push(player);

    await from.save();
    await to.save();

    res.json({ success: true });
  } catch (err) {
    console.error(
      'POST /api/group-admin/:groupId/events/:eventId/teams/move error',
      err
    );
    res.status(500).json({ error: 'Server error' });
  }
});

// --- Subscriber Management (admin) ---

// List subscribers for a group (admin)
router.get('/:groupId/subscribers', async (req, res) => {
  try {
    const { adminCode } = req.query;
    if (!checkAdminCode(adminCode)) {
      return res.status(403).json({ error: 'Invalid admin code' });
    }

    const groupId = req.params.groupId;

    const group = await Group.findById(groupId);
    if (!group || group.isArchived) {
      return res.status(404).json({ error: 'Group not found' });
    }

    const subs = await Subscriber.find({ groupId }).sort('-joinedAt');
    res.json(subs);
  } catch (err) {
    console.error(
      'GET /api/group-admin/:groupId/subscribers error',
      err
    );
    res.status(500).json({ error: 'Server error' });
  }
});

// Remove subscriber (admin)
router.delete('/:groupId/subscribers/:subscriberId', async (req, res) => {
  try {
    const { adminCode } = req.body;
    if (!checkAdminCode(adminCode)) {
      return res.status(403).json({ error: 'Invalid admin code' });
    }

    const groupId = req.params.groupId;
    const subscriberId = req.params.subscriberId;

    const sub = await Subscriber.findOne({ _id: subscriberId, groupId });
    if (!sub) {
      return res.status(404).json({ error: 'Subscriber not found' });
    }

    await sub.deleteOne();
    res.json({ success: true });
  } catch (err) {
    console.error(
      'DELETE /api/group-admin/:groupId/subscribers/:subscriberId error',
      err
    );
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
