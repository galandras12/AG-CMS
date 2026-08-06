const express = require('express');
const { requireAuth } = require('../middleware/auth.middleware');
const { generateSite } = require('../services/generator');

const router = express.Router();

router.post('/', requireAuth, async (req, res, next) => {
  try {
    const result = await generateSite();
    res.json({ build: result });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
