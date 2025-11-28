require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const path = require('path');

const Group = require('./models/Group');
// const eventsRouter = require('./routes/events');
const groupAdminRouter = require('./routes/groupAdmin');
const subscribersRouter = require('./routes/subscribers');
const uploadLogoRouter = require('./routes/upload-logo');

const globalSettingsRouter = require('./routes/globalSettings');
const settingsRouter = require('./routes/settings');

const app = express();

// --- Sanity check for required env vars ---
if (!process.env.MONGODB_URI) {
  console.error('MONGODB_URI is not set in .env');
  process.exit(1);
}

// --- Middleware ---
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- Static files ---
app.use(express.static(path.join(__dirname, '../public')));

// --- API routers ---
// app.use('/api/events', eventsRouter);
app.use('/api/group-admin', groupAdminRouter);
app.use('/api/subscribers', subscribersRouter);
app.use('/api/upload-logo', uploadLogoRouter);

app.use('/api/global-settings', globalSettingsRouter);
app.use('/api/settings', settingsRouter);

// --- Helpers ---
function checkAdminCode(code) {
  return code && code === process.env.ADMIN_CODE;
}

// --- Site-wide admin: list all groups ---
app.get('/api/groups', async (req, res) => {
  try {
    const { adminCode } = req.query;
    if (!checkAdminCode(adminCode)) {
      return res.status(403).json({ error: 'Invalid admin code' });
    }

    const groups = await Group.find({ isArchived: false }).sort('createdAt');
    res.json(groups);
  } catch (err) {
    console.error('GET /api/groups error', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// --- Get single group by id (public) ---
app.get('/api/groups/:groupId', async (req, res) => {
  try {
    const group = await Group.findById(req.params.groupId);
    if (!group || group.isArchived) {
      return res.status(404).json({ error: 'Group not found' });
    }
    res.json(group);
  } catch (err) {
    console.error('GET /api/groups/:groupId error', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// --- Create new group (site-wide admin only) ---
app.post('/api/groups', async (req, res) => {
  try {
    const { adminCode, name, description, template, logoUrl } = req.body;
    if (!checkAdminCode(adminCode)) {
      return res.status(403).json({ error: 'Invalid admin code' });
    }

    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }

    // Check for duplicate group name
    const existingName = await Group.findOne({ name });
    if (existingName) {
      return res.status(409).json({ error: 'A group with this name already exists. Please choose a different name.' });
    }

    // Generate unique access code
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let accessCode;
    // Simple loop to avoid collisions
    // eslint-disable-next-line no-constant-condition
    while (true) {
      accessCode = Array.from({ length: 6 }, () =>
        alphabet[Math.floor(Math.random() * alphabet.length)]
      ).join('');
      const existing = await Group.findOne({ accessCode });
      if (!existing) break;
    }

    const group = new Group({
      name,
      description,
      template: template || 'golf',
      logoUrl,
      accessCode
    });

    await group.save();
    res.status(201).json(group);
  } catch (err) {
    // Handle duplicate key error for accessCode
    if (err.code === 11000 && err.keyPattern && err.keyPattern.accessCode) {
      return res.status(409).json({ error: 'A group with this access code already exists. Please try again.' });
    }
    // Handle duplicate key error for legacy code index
    if (err.code === 11000 && err.keyPattern && err.keyPattern.code) {
      return res.status(409).json({ error: 'A group with a legacy code already exists. Please contact support.' });
    }
    console.error('POST /api/groups error', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// --- Update group (site-wide admin only) ---
app.put('/api/groups/:groupId', async (req, res) => {
  try {
    const { adminCode, name, description, template, logoUrl, isActive } = req.body;
    if (!checkAdminCode(adminCode)) {
      return res.status(403).json({ error: 'Invalid admin code' });
    }

    const group = await Group.findById(req.params.groupId);
    if (!group || group.isArchived) {
      return res.status(404).json({ error: 'Group not found' });
    }

    if (name !== undefined) group.name = name;
    if (description !== undefined) group.description = description;
    if (template !== undefined) group.template = template;
    if (logoUrl !== undefined) group.logoUrl = logoUrl;
    if (isActive !== undefined) group.isActive = isActive;

    await group.save();
    res.json(group);
  } catch (err) {
    console.error('PUT /api/groups/:groupId error', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// --- Soft delete (archive) group (site-wide admin only) ---
app.delete('/api/groups/:groupId', async (req, res) => {
  try {
    const { adminCode } = req.body;
    if (!checkAdminCode(adminCode)) {
      return res.status(403).json({ error: 'Invalid admin code' });
    }

    const group = await Group.findById(req.params.groupId);
    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }

    group.isArchived = true;
    await group.save();

    res.json({ success: true });
  } catch (err) {
    console.error('DELETE /api/groups/:groupId error', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// --- Group access by access code (public) ---
app.post('/api/groups/access', async (req, res) => {
  try {
    const { accessCode } = req.body;
    if (!accessCode) {
      return res.status(400).json({ error: 'Access code is required' });
    }

    const normalized = String(accessCode).trim().toUpperCase();
    const group = await Group.findOne({
      accessCode: normalized,
      isArchived: false
    });

    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }

    res.json({ groupId: group._id.toString() });
  } catch (err) {
    console.error('POST /api/groups/access error', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// --- Serve home.html at root ---
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/home.html'));
});

// --- Start server only after MongoDB connects ---
async function start() {
  try {
    await mongoose.connect(process.env.MONGODB_URI, { dbName: 'dev-tee-time-brs' });
    console.log('MongoDB connected');

    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  } catch (err) {
    console.error('MongoDB connection error', err);
    process.exit(1);
  }
}

start();
