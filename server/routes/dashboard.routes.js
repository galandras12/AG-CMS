const express = require('express');
const fs = require('fs');
const path = require('path');
const dashboardLayoutModel = require('../models/dashboardLayout.model');
const postsModel = require('../models/posts.model');
const usersModel = require('../models/users.model');
const mediaModel = require('../models/media.model');
const { requireAuth } = require('../middleware/auth.middleware');
const config = require('../config');

const router = express.Router();

router.use(requireAuth);

router.get('/layout', (req, res) => {
  res.json({ layout: dashboardLayoutModel.getLayout(req.user.sub) });
});

router.patch('/layout', async (req, res, next) => {
  try {
    const { order, hidden } = req.body || {};
    if (!Array.isArray(order)) {
      return res.status(400).json({ error: 'Az order tomb megadasa kotelezo.' });
    }
    const layout = await dashboardLayoutModel.saveLayout(req.user.sub, { order, hidden });
    res.json({ layout });
  } catch (err) {
    next(err);
  }
});

function readChangelog() {
  try {
    const raw = fs.readFileSync(path.join(config.rootDir, 'config', 'changelog.json'), 'utf8');
    const data = JSON.parse(raw);
    return data.entries?.[0] || null;
  } catch (err) {
    return null;
  }
}

router.get('/blocks-data', async (req, res, next) => {
  try {
    const [posts, users, media] = await Promise.all([postsModel.list(), usersModel.list(), mediaModel.list()]);

    res.json({
      system: {
        name: 'AG-CMS',
        version: config.versionInfo.version,
        versionName: config.versionInfo.versionName,
        updated: config.versionInfo.released,
        changelog: readChangelog(),
      },
      recentPosts: posts.slice(0, 5).map((p) => ({
        id: p.id,
        title: p.title,
        status: p.effectiveStatus,
        updatedAt: p.updatedAt,
      })),
      userSummary: {
        total: users.length,
        admins: users.filter((u) => u.role === 'admin').length,
        editors: users.filter((u) => u.role === 'editor').length,
      },
      mediaSummary: {
        total: media.length,
        totalSizeBytes: media.reduce((sum, m) => sum + (m.size || 0), 0),
      },
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
