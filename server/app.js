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
const postsRoutes = require('./routes/posts.routes');
const mediaRoutes = require('./routes/media.routes');
const settingsRoutes = require('./routes/settings.routes');
const widgetsRoutes = require('./routes/widgets.routes');
const dashboardRoutes = require('./routes/dashboard.routes');
const adminMenuRoutes = require('./routes/adminMenu.routes');
const buildRoutes = require('./routes/build.routes');
const themesRoutes = require('./routes/themes.routes');

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
  // Feltoltott mediafajlok - nyilvanosan olvashatok (posztokba, personalizaciohoz beagyazva),
  // az irasuk (upload/torles) auth-hoz kotott a /api/media alatt.
  app.use('/media', express.static(config.mediaDir));
  // Tema elonezetek (theme.json + preview kep) - a temavalaszto galeriahoz.
  app.use('/themes', express.static(path.join(config.rootDir, 'themes')));
  app.use(express.static(config.publicDir));

  app.get('/', (req, res) => {
    // Amig nincs generalt statikus oldal (public/index.html, 4. fazis),
    // a gyoker az admin feluletre iranyit.
    res.redirect('/admin/');
  });

  app.use('/api/health', healthRoutes);
  app.use('/api/auth', authRoutes);
  app.use('/api/users', usersRoutes);
  app.use('/api/posts', postsRoutes);
  app.use('/api/media', mediaRoutes);
  app.use('/api/settings', settingsRoutes);
  app.use('/api/widgets', widgetsRoutes);
  app.use('/api/dashboard', dashboardRoutes);
  app.use('/api/admin', adminMenuRoutes);
  app.use('/api/build', buildRoutes);
  app.use('/api/themes', themesRoutes);

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
