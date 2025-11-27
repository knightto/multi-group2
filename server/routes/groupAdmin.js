const express = require('express');
const router = express.Router();
const Event = require('../models/Event');
const TeeTime = require('../models/TeeTime');
const Team = require('../models/Team');
const Subscriber = require('../models/Subscriber');
const Group = require('../models/Group');

// --- Event Management ---
// List all events for a group (admin)
router.get('/:groupId/events', async (req, res) => {
  const { adminCode } = req.query;
  const group = await Group.findById(req.params.groupId);
  if (!group) return res.status(404).json({ error: 'Group not found' });
  if (adminCode !== req.query.adminCode) return res.status(403).json({ error: 'Invalid admin code' });
  const events = await Event.find({ groupId: req.params.groupId });
  res.json(events);
});

// Delete event (admin)
router.delete('/:groupId/events/:eventId', async (req, res) => {
  const { adminCode } = req.body;
  const group = await Group.findById(req.params.groupId);
  if (!group) return res.status(404).json({ error: 'Group not found' });
  if (adminCode !== req.body.adminCode) return res.status(403).json({ error: 'Invalid admin code' });
  await Event.findByIdAndDelete(req.params.eventId);
  await TeeTime.deleteMany({ eventId: req.params.eventId });
  await Team.deleteMany({ eventId: req.params.eventId });
  res.json({ success: true });
});

// --- Tee Time Management ---
// Create tee times (admin)
router.post('/:groupId/events/:eventId/teetimes', async (req, res) => {
  const { adminCode, teeTimes } = req.body; // teeTimes: [{time, maxPlayers}]
  const group = await Group.findById(req.params.groupId);
  if (!group) return res.status(404).json({ error: 'Group not found' });
  if (adminCode !== req.body.adminCode) return res.status(403).json({ error: 'Invalid admin code' });
  try {
    const created = await TeeTime.insertMany(teeTimes.map(t => ({ ...t, eventId: req.params.eventId })));
    res.status(201).json(created);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Move player between tee times (admin)
router.post('/:groupId/events/:eventId/teetimes/move', async (req, res) => {
  const { adminCode, playerEmail, fromTeeTimeId, toTeeTimeId } = req.body;
  const group = await Group.findById(req.params.groupId);
  if (!group) return res.status(404).json({ error: 'Group not found' });
  if (adminCode !== req.body.adminCode) return res.status(403).json({ error: 'Invalid admin code' });
  const from = await TeeTime.findById(fromTeeTimeId);
  const to = await TeeTime.findById(toTeeTimeId);
  if (!from || !to) return res.status(404).json({ error: 'Tee time not found' });
  const player = from.players.find(p => p.email === playerEmail);
  if (!player) return res.status(404).json({ error: 'Player not found in from tee time' });
  if (to.players.length >= to.maxPlayers) return res.status(400).json({ error: 'Destination tee time full' });
  from.players = from.players.filter(p => p.email !== playerEmail);
  to.players.push(player);
  await from.save();
  await to.save();
  res.json({ success: true });
});

// --- Team Management ---
// Create teams (admin)
router.post('/:groupId/events/:eventId/teams', async (req, res) => {
  const { adminCode, teams } = req.body; // teams: [{name, maxPlayers}]
  const group = await Group.findById(req.params.groupId);
  if (!group) return res.status(404).json({ error: 'Group not found' });
  if (adminCode !== req.body.adminCode) return res.status(403).json({ error: 'Invalid admin code' });
  try {
    const created = await Team.insertMany(teams.map(t => ({ ...t, eventId: req.params.eventId })));
    res.status(201).json(created);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Move player between teams (admin)
router.post('/:groupId/events/:eventId/teams/move', async (req, res) => {
  const { adminCode, playerEmail, fromTeamId, toTeamId } = req.body;
  const group = await Group.findById(req.params.groupId);
  if (!group) return res.status(404).json({ error: 'Group not found' });
  if (adminCode !== req.body.adminCode) return res.status(403).json({ error: 'Invalid admin code' });
  const from = await Team.findById(fromTeamId);
  const to = await Team.findById(toTeamId);
  if (!from || !to) return res.status(404).json({ error: 'Team not found' });
  const player = from.players.find(p => p.email === playerEmail);
  if (!player) return res.status(404).json({ error: 'Player not found in from team' });
  if (to.players.length >= to.maxPlayers) return res.status(400).json({ error: 'Destination team full' });
  from.players = from.players.filter(p => p.email !== playerEmail);
  to.players.push(player);
  await from.save();
  await to.save();
  res.json({ success: true });
});

// --- Subscriber Management ---
// List subscribers
router.get('/:groupId/subscribers', async (req, res) => {
  const { adminCode } = req.query;
  const group = await Group.findById(req.params.groupId);
  if (!group) return res.status(404).json({ error: 'Group not found' });
  if (adminCode !== req.query.adminCode) return res.status(403).json({ error: 'Invalid admin code' });
  const subs = await Subscriber.find({ groupId: req.params.groupId });
  res.json(subs);
});
// Remove subscriber
router.delete('/:groupId/subscribers/:subscriberId', async (req, res) => {
  const { adminCode } = req.body;
  const group = await Group.findById(req.params.groupId);
  if (!group) return res.status(404).json({ error: 'Group not found' });
  if (adminCode !== req.body.adminCode) return res.status(403).json({ error: 'Invalid admin code' });
  await Subscriber.findByIdAndDelete(req.params.subscriberId);
  res.json({ success: true });
});

module.exports = router;
