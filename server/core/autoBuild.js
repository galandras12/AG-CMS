const hooks = require('./hooks');
const logger = require('./logger');

/**
 * Automatikus statikus-oldal-generalas bekötese: bejegyzes mentes/torles,
 * beallitasok (pl. temavaltas) es widget valtozas utan. A hiba szandekosan
 * el van nyelve (csak logolva) - egy sikertelen generalas nem szabad, hogy
 * elbuktassa a mentes API hivast, mivel az adat mar sikeresen elmentodott.
 */
function registerAutoBuild(generateSite) {
  const trigger = async () => {
    try {
      await generateSite();
    } catch (err) {
      logger.error('[autoBuild] Sikertelen automatikus generalas:', err.message);
    }
  };

  hooks.on('post:afterSave', trigger);
  hooks.on('post:afterDelete', trigger);
  hooks.on('settings:afterUpdate', trigger);
  hooks.on('widgets:afterChange', trigger);
}

module.exports = { registerAutoBuild };
