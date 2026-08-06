const express = require('express');
const usersModel = require('../models/users.model');
const { sign, EXPIRES_IN_MS } = require('../core/jwt');
const { requireAuth, COOKIE_NAME } = require('../middleware/auth.middleware');
const { loginLimiter } = require('../middleware/rateLimit.middleware');
const config = require('../config');
const hooks = require('../core/hooks');

const router = express.Router();

router.post('/login', loginLimiter, async (req, res, next) => {
  try {
    const { username, password } = req.body || {};
    if (!username || !password) {
      return res.status(400).json({ error: 'Felhasznalonev es jelszo megadasa kotelezo.' });
    }

    const user = await usersModel.verifyCredentials(username, password);
    if (!user) {
      return res.status(401).json({ error: 'Hibas felhasznalonev vagy jelszo.' });
    }

    const token = sign(user);
    res.cookie(COOKIE_NAME, token, {
      httpOnly: true,
      signed: true,
      sameSite: 'lax',
      secure: config.nodeEnv === 'production',
      maxAge: EXPIRES_IN_MS,
    });

    await hooks.trigger('auth:afterLogin', user);

    res.json({ user });
  } catch (err) {
    next(err);
  }
});

router.post('/logout', (req, res) => {
  res.clearCookie(COOKIE_NAME);
  res.json({ ok: true });
});

router.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.user });
});

module.exports = router;
