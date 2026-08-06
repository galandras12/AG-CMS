const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const config = require('./config');
const logger = require('./core/logger');
const healthRoutes = require('./routes/health.routes');

function createApp() {
  const app = express();
  app.disable('x-powered-by');

  app.use(helmet());
  app.use(cors({ origin: config.allowedOrigin, credentials: true }));
  app.use(express.json({ limit: '2mb' }));
  app.use(cookieParser(config.cookieSecret || undefined));

  app.use('/api/health', healthRoutes);

  app.use((req, res) => {
    res.status(404).json({ error: 'Not found' });
  });

  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    logger.error(err);
    res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
  });

  return app;
}

module.exports = createApp;
