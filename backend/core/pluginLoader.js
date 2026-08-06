const fs = require('fs');
const path = require('path');
const hooks = require('./hooks');
const config = require('../config');

const PLUGINS_DIR = path.join(config.rootDir, 'plugins');

/**
 * Beolvassa a plugins/ mappa alatti pluginokat. Egy plugin egy alkonyvtár,
 * amiben van egy plugin.json manifest ({ name, version, author, main, enabled })
 * és egy belepesi pont (alapertelmezetten index.js), ami egy
 * `register(hooks, context)` fuggvenyt export.
 */
function loadPlugins(context = {}) {
  if (!fs.existsSync(PLUGINS_DIR)) return [];

  const loaded = [];
  const entries = fs
    .readdirSync(PLUGINS_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory());

  for (const entry of entries) {
    const pluginDir = path.join(PLUGINS_DIR, entry.name);
    const manifestPath = path.join(pluginDir, 'plugin.json');
    if (!fs.existsSync(manifestPath)) continue;

    let manifest;
    try {
      manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    } catch (err) {
      context.logger?.warn(`[pluginLoader] Ervenytelen plugin.json: ${entry.name} (${err.message})`);
      continue;
    }

    if (manifest.enabled === false) continue;

    const entryFile = path.join(pluginDir, manifest.main || 'index.js');
    if (!fs.existsSync(entryFile)) {
      context.logger?.warn(`[pluginLoader] Hianyzo belepesi pont: ${entryFile}`);
      continue;
    }

    // eslint-disable-next-line import/no-dynamic-require, global-require
    const plugin = require(entryFile);
    if (typeof plugin.register !== 'function') {
      context.logger?.warn(`[pluginLoader] A "${manifest.name}" plugin nem export register() fuggvenyt.`);
      continue;
    }

    plugin.register(hooks, { ...context, manifest, pluginDir });
    loaded.push(manifest.name);
  }

  return loaded;
}

module.exports = { loadPlugins, PLUGINS_DIR };
