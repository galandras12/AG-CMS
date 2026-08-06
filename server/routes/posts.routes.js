const express = require('express');
const postsModel = require('../models/posts.model');
const { requireAuth } = require('../middleware/auth.middleware');

const router = express.Router();

router.use(requireAuth);

router.get('/', async (req, res, next) => {
  try {
    const { status } = req.query;
    res.json({ posts: await postsModel.list({ status }) });
  } catch (err) {
    next(err);
  }
});

router.get('/:id', (req, res) => {
  const post = postsModel.findByIdRaw(req.params.id);
  if (!post) return res.status(404).json({ error: 'Bejegyzes nem talalhato.' });
  res.json({ post });
});

router.post('/', async (req, res, next) => {
  try {
    const { title, status } = req.body || {};
    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'A cim megadasa kotelezo.' });
    }
    if (status && !postsModel.VALID_STATUS.includes(status)) {
      return res.status(400).json({ error: `Ervenytelen statusz. Lehetseges ertekek: ${postsModel.VALID_STATUS.join(', ')}` });
    }
    const post = await postsModel.create(req.body, req.user);
    res.status(201).json({ post });
  } catch (err) {
    next(err);
  }
});

router.patch('/:id', async (req, res, next) => {
  try {
    if (req.body?.status && !postsModel.VALID_STATUS.includes(req.body.status)) {
      return res.status(400).json({ error: `Ervenytelen statusz. Lehetseges ertekek: ${postsModel.VALID_STATUS.join(', ')}` });
    }
    const post = await postsModel.update(req.params.id, req.body || {});
    res.json({ post });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    await postsModel.remove(req.params.id);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

module.exports = router;
