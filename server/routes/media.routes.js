const express = require('express');
const multer = require('multer');
const crypto = require('crypto');
const path = require('path');
const config = require('../config');
const mediaModel = require('../models/media.model');
const { requireAuth } = require('../middleware/auth.middleware');

const router = express.Router();

const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml']);

mediaModel.ensureMediaDir();

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, config.mediaDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${crypto.randomUUID()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_MIME.has(file.mimetype)) {
      return cb(Object.assign(new Error('Nem tamogatott fajltipus.'), { status: 400 }));
    }
    cb(null, true);
  },
});

router.use(requireAuth);

router.get('/', async (req, res, next) => {
  try {
    res.json({ media: await mediaModel.list() });
  } catch (err) {
    next(err);
  }
});

router.post('/', (req, res, next) => {
  upload.single('file')(req, res, (err) => {
    if (err) {
      return res.status(err.status || 400).json({ error: err.message || 'Feltoltesi hiba.' });
    }
    next();
  });
}, async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Nincs csatolt fajl.' });
    }
    const item = await mediaModel.registerUpload({
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      size: req.file.size,
      storedFilename: req.file.filename,
      uploadedBy: req.user.sub,
    });
    res.status(201).json({ media: item });
  } catch (err) {
    next(err);
  }
});

router.patch('/:id', async (req, res, next) => {
  try {
    const item = await mediaModel.updateAltText(req.params.id, req.body?.altText);
    res.json({ media: item });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    await mediaModel.remove(req.params.id);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

module.exports = router;
