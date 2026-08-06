const path = require('path');
const fs = require('fs');

require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const rootDir = path.join(__dirname, '../..');
// AGCMS_DATA_DIR_OVERRIDE: csak tesztekben hasznalt, hogy a titkositott
// tarolo egy ideiglenes mappaba irjon a valodi content/data helyett.
const dataDir = process.env.AGCMS_DATA_DIR_OVERRIDE
  ? path.resolve(process.env.AGCMS_DATA_DIR_OVERRIDE)
  : path.join(rootDir, 'content', 'data');
const mediaDir = path.join(rootDir, 'content', 'media');

const REQUIRED_ENV = ['ENCRYPTION_KEY', 'JWT_SECRET', 'COOKIE_SECRET'];
for (const key of REQUIRED_ENV) {
  if (!process.env[key]) {
    throw new Error(
      `Hianyzo kotelezo env valtozo: ${key}. Masold le a .env.example fajlt .env nevre, es allitsd be. ` +
        `Kulcs generalasa: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
    );
  }
}

function readJsonSafe(filePath, fallback) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (err) {
    return fallback;
  }
}

const connection = readJsonSafe(path.join(rootDir, 'config', 'connection.json'), {
  backendUrl: `http://localhost:${process.env.PORT || 4000}`,
});

const versionInfo = readJsonSafe(path.join(rootDir, 'config', 'version.json'), {
  version: '0.0.0',
  versionName: '',
  released: '',
});

module.exports = {
  rootDir,
  dataDir,
  mediaDir,
  port: parseInt(process.env.PORT, 10) || 4000,
  nodeEnv: process.env.NODE_ENV || 'development',
  encryptionKey: process.env.ENCRYPTION_KEY,
  jwtSecret: process.env.JWT_SECRET,
  cookieSecret: process.env.COOKIE_SECRET,
  allowedOrigin: process.env.ALLOWED_ORIGIN || '',
  adminUsername: process.env.ADMIN_USERNAME || 'admin',
  adminPassword: process.env.ADMIN_PASSWORD || '',
  connection,
  versionInfo,
};
