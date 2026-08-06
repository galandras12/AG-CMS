const crypto = require('crypto');
const usersModel = require('../models/users.model');
const config = require('../config');
const logger = require('./logger');

/**
 * Ha meg egyetlen felhasznalo sincs a rendszerben, letrehoz egy elso admin
 * fiokot. Ez oldja fel a "regisztracio admin altal" tojas-tyuk problemat:
 * valakinek be kell tudni lepnie ahhoz, hogy tovabbi felhasznalokat hozzon
 * letre az admin feluleten.
 */
async function bootstrapAdmin() {
  if (usersModel.count() > 0) return;

  const username = config.adminUsername;
  const usingGeneratedPassword = !config.adminPassword;
  const password = config.adminPassword || crypto.randomBytes(9).toString('base64url');

  await usersModel.create({ username, password, role: 'admin', displayName: 'Administrator' });

  logger.info('====================================================');
  logger.info('  Nincs meg felhasznalo - elso admin fiok letrehozva.');
  logger.info(`  Felhasznalonev: ${username}`);
  if (usingGeneratedPassword) {
    logger.info(`  Jelszo:         ${password}`);
    logger.info('  Jelentkezz be, es valtoztasd meg ezt a jelszot minel elobb!');
  } else {
    logger.info('  Jelszo:         (az ADMIN_PASSWORD env valtozobol allitva)');
  }
  logger.info('====================================================');
}

module.exports = { bootstrapAdmin };
