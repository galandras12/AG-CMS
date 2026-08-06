const express = require('express');
const adminMenu = require('../core/adminMenu');
const { requireAuth } = require('../middleware/auth.middleware');

const router = express.Router();

router.get('/menu', requireAuth, (req, res) => {
  const menu = adminMenu.getMenu().filter((item) => !item.roles || item.roles.includes(req.user.role));
  res.json({ menu });
});

module.exports = router;
