const config = require('./config');
const createApp = require('./app');
const hooks = require('./core/hooks');
const { loadPlugins } = require('./core/pluginLoader');
const { bootstrapAdmin } = require('./core/bootstrapAdmin');
const { registerAutoBuild } = require('./core/autoBuild');
const adminMenu = require('./core/adminMenu');
const { generateSite } = require('./services/generator');
const logger = require('./core/logger');

async function start() {
  await bootstrapAdmin();

  const loadedPlugins = loadPlugins({ logger, config });
  logger.info(`Betoltott pluginok (${loadedPlugins.length}): ${loadedPlugins.join(', ') || '-'}`);

  // A pluginok az 'admin:menu:register' hook-on keresztul sajat menupontokat
  // adhatnak az admin oldalsavhoz (lasd plugins/README.md).
  await hooks.trigger('admin:menu:register', { registerItem: adminMenu.registerMenuItem });

  // Mentes/beallitas/widget valtozas utan automatikusan ujragneralja a
  // statikus oldalt (lasd server/core/autoBuild.js).
  registerAutoBuild(generateSite);

  const app = createApp();

  app.listen(config.port, async () => {
    const { version, versionName } = config.versionInfo;
    logger.info(`AG-CMS szerver fut: http://localhost:${config.port} - v${version} (${versionName})`);

    try {
      await generateSite();
    } catch (err) {
      logger.error('[server] Kezdeti statikus generalas sikertelen:', err.message);
    }

    await hooks.trigger('server:ready', { port: config.port });
  });
}

start().catch((err) => {
  logger.error('Nem sikerult elinditani a szervert:', err);
  process.exit(1);
});
