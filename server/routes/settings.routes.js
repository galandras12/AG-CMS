const express = require('express');
const settingsModel = require('../models/settings.model');
const { requireAuth, requireRole } = require('../middleware/auth.middleware');

const router = express.Router();

// A GET publikus (nincs auth): a jovobeli statikus generatornak es a
// bejelentkezes elotti admin login felulet szamara (pl. site nev) is kell.
router.get('/', (req, res) => {
  res.json({ settings: settingsModel.get() });
});

router.patch('/', requireAuth, requireRole('admin'), async (req, res, next) => {
  try {
    const settings = await settingsModel.update(req.body || {});
    res.json({ settings });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
