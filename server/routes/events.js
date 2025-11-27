const express = require('express');
const router = express.Router();
const Event = require('../models/Event');
const TeeTime = require('../models/TeeTime');
const Team = require('../models/Team');
const Group = require('../models/Group');

// Get all upcoming events for a group
router.get('/group/:groupId', async (req, res) => {
  const events = await Event.find({ groupId: req.params.groupId, isActive: true, date: { $gte: new Date() } }).sort('date');
  res.json(events);
});

// Create event (group admin)
router.post('/group/:groupId', async (req, res) => {
  const { adminCode, ...eventData } = req.body;
  const group = await Group.findById(req.params.groupId);
  if (!group) return res.status(404).json({ error: 'Group not found' });
  if (adminCode !== req.body.adminCode) return res.status(403).json({ error: 'Invalid admin code' });
  try {
    const event = new Event({ ...eventData, groupId: req.params.groupId });
    await event.save();
    res.status(201).json(event);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});


// Get event details (public)
router.get('/:eventId', async (req, res) => {
  const event = await Event.findById(req.params.eventId);
  if (!event) return res.status(404).json({ error: 'Event not found' });
  res.json(event);
});

// Get tee times for an event
router.get('/:eventId/teetimes', async (req, res) => {
  const teeTimes = await TeeTime.find({ eventId: req.params.eventId });
  res.json(teeTimes);
});

// Get teams for an event
router.get('/:eventId/teams', async (req, res) => {
  const teams = await Team.find({ eventId: req.params.eventId });
  res.json(teams);
});

// Signup for a tee time
router.post('/:eventId/teetimes/:teeTimeId/signup', async (req, res) => {
  const { name, email } = req.body;
  const teeTime = await TeeTime.findById(req.params.teeTimeId);
  if (!teeTime) return res.status(404).json({ error: 'Tee time not found' });
  if (teeTime.players.find(p => p.email === email)) return res.status(400).json({ error: 'Already signed up' });
  if (teeTime.players.length >= teeTime.maxPlayers) return res.status(400).json({ error: 'Tee time full' });
  teeTime.players.push({ name, email });
  await teeTime.save();
  res.json({ success: true });
});

// Remove self from tee time
router.post('/:eventId/teetimes/:teeTimeId/remove', async (req, res) => {
  const { email } = req.body;
  const teeTime = await TeeTime.findById(req.params.teeTimeId);
  if (!teeTime) return res.status(404).json({ error: 'Tee time not found' });
  teeTime.players = teeTime.players.filter(p => p.email !== email);
  await teeTime.save();
  res.json({ success: true });
});

// Signup for a team
router.post('/:eventId/teams/:teamId/signup', async (req, res) => {
  const { name, email } = req.body;
  const team = await Team.findById(req.params.teamId);
  if (!team) return res.status(404).json({ error: 'Team not found' });
  if (team.players.find(p => p.email === email)) return res.status(400).json({ error: 'Already signed up' });
  if (team.players.length >= team.maxPlayers) return res.status(400).json({ error: 'Team full' });
  team.players.push({ name, email });
  await team.save();
  res.json({ success: true });
});

// Remove self from team
router.post('/:eventId/teams/:teamId/remove', async (req, res) => {
  const { email } = req.body;
  const team = await Team.findById(req.params.teamId);
  if (!team) return res.status(404).json({ error: 'Team not found' });
  team.players = team.players.filter(p => p.email !== email);
  await team.save();
  res.json({ success: true });
});

module.exports = router;
