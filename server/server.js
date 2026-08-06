const config = require('./config');
const createApp = require('./app');
const hooks = require('./core/hooks');
const { loadPlugins } = require('./core/pluginLoader');
const logger = require('./core/logger');

const loadedPlugins = loadPlugins({ logger, config });
logger.info(`Betoltott pluginok (${loadedPlugins.length}): ${loadedPlugins.join(', ') || '-'}`);

const app = createApp();

app.listen(config.port, async () => {
  const { version, versionName } = config.versionInfo;
  logger.info(`AG-CMS backend fut: http://localhost:${config.port} - v${version} (${versionName})`);
  await hooks.trigger('server:ready', { port: config.port });
});
