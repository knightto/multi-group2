const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const router = express.Router();

// Set up multer for file uploads
const upload = multer({
  dest: path.join(__dirname, '../../public/assets'),
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB max
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Only image files are allowed!'));
    }
    cb(null, true);
  }
});

router.post('/', upload.single('logo'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  // Rename file to include original extension
  const ext = path.extname(req.file.originalname) || '.png';
  const newPath = req.file.path + ext;
  fs.rename(req.file.path, newPath, err => {
    if (err) return res.status(500).json({ error: 'File save error' });
    // Return public URL
    const url = `/assets/${path.basename(newPath)}`;
    res.json({ url });
  });
});

module.exports = router;
