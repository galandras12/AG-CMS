const path = require('path');
const fs = require('fs');

require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const rootDir = path.join(__dirname, '../..');
// AGCMS_*_DIR_OVERRIDE: csak tesztekben hasznalt, hogy a titkositott tarolo,
// a mediafajlok es a generalt statikus oldal ideiglenes mappakba iranyuljanak
// a valodi content/data, content/media es public/ helyett.
const dataDir = process.env.AGCMS_DATA_DIR_OVERRIDE
  ? path.resolve(process.env.AGCMS_DATA_DIR_OVERRIDE)
  : path.join(rootDir, 'content', 'data');
const mediaDir = process.env.AGCMS_MEDIA_DIR_OVERRIDE
  ? path.resolve(process.env.AGCMS_MEDIA_DIR_OVERRIDE)
  : path.join(rootDir, 'content', 'media');
const publicDir = process.env.AGCMS_PUBLIC_DIR_OVERRIDE
  ? path.resolve(process.env.AGCMS_PUBLIC_DIR_OVERRIDE)
  : path.join(rootDir, 'public');

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
  publicDir,
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
