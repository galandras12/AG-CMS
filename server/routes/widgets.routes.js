const express = require('express');
const widgetsModel = require('../models/widgets.model');
const { requireAuth } = require('../middleware/auth.middleware');

const router = express.Router();

router.use(requireAuth);

router.get('/', async (req, res, next) => {
  try {
    res.json({ widgets: await widgetsModel.list() });
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const { type, title, config, region } = req.body || {};
    if (!widgetsModel.VALID_TYPES.includes(type)) {
      return res.status(400).json({ error: `Ervenytelen widget tipus. Lehetseges: ${widgetsModel.VALID_TYPES.join(', ')}` });
    }
    if (region && !widgetsModel.VALID_REGIONS.includes(region)) {
      return res.status(400).json({ error: `Ervenytelen regio. Lehetseges: ${widgetsModel.VALID_REGIONS.join(', ')}` });
    }
    const widget = await widgetsModel.create({ type, title, config, region });
    res.status(201).json({ widget });
  } catch (err) {
    next(err);
  }
});

router.patch('/reorder', async (req, res, next) => {
  try {
    const { order } = req.body || {};
    if (!Array.isArray(order)) {
      return res.status(400).json({ error: 'Az order tomb megadasa kotelezo.' });
    }
    const widgets = await widgetsModel.reorder(order);
    res.json({ widgets });
  } catch (err) {
    next(err);
  }
});

router.patch('/:id', async (req, res, next) => {
  try {
    const widget = await widgetsModel.update(req.params.id, req.body || {});
    res.json({ widget });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    await widgetsModel.remove(req.params.id);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

module.exports = router;
