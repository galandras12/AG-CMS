const express = require('express');
const usersModel = require('../models/users.model');
const { requireAuth, requireRole } = require('../middleware/auth.middleware');

const router = express.Router();
const VALID_ROLES = ['admin', 'editor'];

router.use(requireAuth, requireRole('admin'));

router.get('/', async (req, res, next) => {
  try {
    res.json({ users: await usersModel.list() });
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const { username, password, role, displayName } = req.body || {};
    if (!username || !password || !role) {
      return res.status(400).json({ error: 'Felhasznalonev, jelszo es szerepkor megadasa kotelezo.' });
    }
    if (!VALID_ROLES.includes(role)) {
      return res.status(400).json({ error: `Ervenytelen szerepkor. Lehetseges ertekek: ${VALID_ROLES.join(', ')}` });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: 'A jelszonak legalabb 8 karakter hosszunak kell lennie.' });
    }
    const user = await usersModel.create({ username, password, role, displayName });
    res.status(201).json({ user });
  } catch (err) {
    next(err);
  }
});

router.patch('/:id', async (req, res, next) => {
  try {
    const { role, displayName, active } = req.body || {};
    if (role && !VALID_ROLES.includes(role)) {
      return res.status(400).json({ error: `Ervenytelen szerepkor. Lehetseges ertekek: ${VALID_ROLES.join(', ')}` });
    }

    const target = usersModel.findByIdRaw(req.params.id);
    if (!target) {
      return res.status(404).json({ error: 'Felhasznalo nem talalhato.' });
    }

    const wouldLoseLastAdmin =
      target.role === 'admin' &&
      ((role && role !== 'admin') || active === false) &&
      usersModel.countAdmins(target.id) === 0;
    if (wouldLoseLastAdmin) {
      return res.status(400).json({ error: 'Ez a muvelet az utolso admin felhasznalot fokozna le vagy deaktivalna.' });
    }

    const user = await usersModel.update(req.params.id, { role, displayName, active });
    res.json({ user });
  } catch (err) {
    next(err);
  }
});

router.post('/:id/password', async (req, res, next) => {
  try {
    const { password } = req.body || {};
    if (!password || password.length < 8) {
      return res.status(400).json({ error: 'A jelszonak legalabb 8 karakter hosszunak kell lennie.' });
    }
    const user = await usersModel.setPassword(req.params.id, password);
    res.json({ user });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    if (req.params.id === req.user.sub) {
      return res.status(400).json({ error: 'Sajat magadat nem torolheted.' });
    }
    const target = usersModel.findByIdRaw(req.params.id);
    if (!target) {
      return res.status(404).json({ error: 'Felhasznalo nem talalhato.' });
    }
    if (target.role === 'admin' && usersModel.countAdmins(target.id) === 0) {
      return res.status(400).json({ error: 'Nem torolheted az utolso admin felhasznalot.' });
    }
    await usersModel.remove(req.params.id);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

module.exports = router;
