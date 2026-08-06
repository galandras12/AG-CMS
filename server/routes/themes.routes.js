const express = require('express');
const fs = require('fs');
const path = require('path');
const config = require('../config');
const { requireAuth } = require('../middleware/auth.middleware');

const router = express.Router();
const THEMES_DIR = path.join(config.rootDir, 'themes');

router.get('/', requireAuth, (req, res) => {
  if (!fs.existsSync(THEMES_DIR)) {
    return res.json({ themes: [] });
  }

  const themes = fs
    .readdirSync(THEMES_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => {
      const metaPath = path.join(THEMES_DIR, entry.name, 'theme.json');
      if (!fs.existsSync(metaPath)) return null;
      try {
        const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
        return { ...meta, previewUrl: meta.preview ? `/themes/${entry.name}/${meta.preview}` : null };
      } catch (err) {
        return null;
      }
    })
    .filter(Boolean);

  res.json({ themes });
});

module.exports = router;
