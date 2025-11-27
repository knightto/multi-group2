const express = require('express');
const router = express.Router();
const Subscriber = require('../models/Subscriber');
const Group = require('../models/Group');

// Subscribe to a group (public)
router.post('/:groupId', async (req, res) => {
  const { name, email } = req.body;
  const group = await Group.findById(req.params.groupId);
  if (!group) return res.status(404).json({ error: 'Group not found' });
  if (!email) return res.status(400).json({ error: 'Email required' });
  let sub = await Subscriber.findOne({ groupId: req.params.groupId, email });
  if (sub) return res.status(400).json({ error: 'Already subscribed' });
  sub = new Subscriber({ groupId: req.params.groupId, name, email });
  await sub.save();
  res.json({ success: true });
});

// Unsubscribe (public)
router.post('/:groupId/unsubscribe', async (req, res) => {
  const { email } = req.body;
  await Subscriber.deleteOne({ groupId: req.params.groupId, email });
  res.json({ success: true });
});

module.exports = router;
