require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const path = require('path');

const Group = require('./models/Group');
// Event routes

const eventsRouter = require('./routes/events');

const groupAdminRouter = require('./routes/groupAdmin');

const subscribersRouter = require('./routes/subscribers');
const globalSettingsRouter = require('./routes/globalSettings');

const app = express();
app.use(express.json());

app.use(express.static(path.join(__dirname, '../public')));
// API routes

app.use('/api/events', eventsRouter);

app.use('/api/group-admin', groupAdminRouter);

app.use('/api/subscribers', subscribersRouter);
app.use('/api/global-settings', globalSettingsRouter);

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI);

// --- API ROUTES ---

// Create a new group (site admin only)
app.post('/api/groups', async (req, res) => {
  const { adminCode, name, description, template, logoUrl } = req.body;
  if (adminCode !== process.env.ADMIN_CODE) return res.status(403).json({ error: 'Invalid admin code' });
  try {
    // Generate unique access code
    const accessCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    const group = new Group({ name, description, template, logoUrl, accessCode });
    await group.save();
    res.status(201).json(group);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Get all groups (site admin only)
app.get('/api/groups', async (req, res) => {
  const { adminCode } = req.query;
  if (adminCode !== process.env.ADMIN_CODE) return res.status(403).json({ error: 'Invalid admin code' });
  const groups = await Group.find({ isArchived: false });
  res.json(groups);
});

// Get group by access code (for home page)
app.post('/api/groups/access', async (req, res) => {
  const { accessCode } = req.body;
  const group = await Group.findOne({ accessCode, isActive: true, isArchived: false });
  if (!group) return res.status(404).json({ error: 'Invalid access code' });
  res.json({ groupId: group._id });
});

// Get group public info by ID
app.get('/api/groups/:groupId', async (req, res) => {
  const group = await Group.findOne({ _id: req.params.groupId, isActive: true, isArchived: false });
  if (!group) return res.status(404).json({ error: 'Group not found' });
  res.json(group);
});

// Update group (site admin only)
app.put('/api/groups/:groupId', async (req, res) => {
  const { adminCode, ...update } = req.body;
  if (adminCode !== process.env.ADMIN_CODE) return res.status(403).json({ error: 'Invalid admin code' });
  try {
    const group = await Group.findByIdAndUpdate(req.params.groupId, update, { new: true });
    res.json(group);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Soft delete group (site admin only)
app.delete('/api/groups/:groupId', async (req, res) => {
  const { adminCode } = req.body;
  if (adminCode !== process.env.ADMIN_CODE) return res.status(403).json({ error: 'Invalid admin code' });
  await Group.findByIdAndUpdate(req.params.groupId, { isArchived: true });
  res.json({ success: true });
});

// --- Serve home.html at root ---
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/home.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
