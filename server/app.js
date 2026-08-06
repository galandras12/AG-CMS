const path = require('path');
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const config = require('./config');
const logger = require('./core/logger');
const healthRoutes = require('./routes/health.routes');
const authRoutes = require('./routes/auth.routes');
const usersRoutes = require('./routes/users.routes');

function createApp() {
  const app = express();
  app.disable('x-powered-by');

  // CSP kikapcsolva: az admin frontend eltero originen futo backendhez is
  // csatlakozhat (config/connection.json), a helmet alap CSP-je ezt blokkolna.
  app.use(helmet({ contentSecurityPolicy: false }));
  // Csak akkor engedelyezett a cross-origin hitelesitett keres, ha az
  // ALLOWED_ORIGIN explicit be van allitva - ures ertek eseten a sajat
  // originrol (pl. /admin ugyanazon a szerveren) mukodik minden, cross-origin
  // hitelesitett API hivast pedig a bongeszo CORS-vedelme blokkolja.
  app.use(cors({ origin: config.allowedOrigin || false, credentials: true }));
  app.use(express.json({ limit: '2mb' }));
  app.use(cookieParser(config.cookieSecret));

  app.use('/admin', express.static(path.join(config.rootDir, 'frontend', 'admin')));
  app.use('/config', express.static(path.join(config.rootDir, 'config')));
  app.use('/langs', express.static(path.join(config.rootDir, 'langs')));
  app.use(express.static(path.join(config.rootDir, 'public')));

  app.get('/', (req, res) => {
    // Amig nincs generalt statikus oldal (public/index.html, 4. fazis),
    // a gyoker az admin feluletre iranyit.
    res.redirect('/admin/');
  });

  app.use('/api/health', healthRoutes);
  app.use('/api/auth', authRoutes);
  app.use('/api/users', usersRoutes);

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
