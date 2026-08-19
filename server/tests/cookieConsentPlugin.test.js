const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');

const tmpDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agcms-cookie-data-'));
const tmpMediaDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agcms-cookie-media-'));
const tmpPublicDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agcms-cookie-public-'));
process.env.AGCMS_DATA_DIR_OVERRIDE = tmpDataDir;
process.env.AGCMS_MEDIA_DIR_OVERRIDE = tmpMediaDir;
process.env.AGCMS_PUBLIC_DIR_OVERRIDE = tmpPublicDir;
process.env.ENCRYPTION_KEY = crypto.randomBytes(32).toString('hex');
process.env.JWT_SECRET = crypto.randomBytes(32).toString('hex');
process.env.COOKIE_SECRET = crypto.randomBytes(32).toString('hex');
process.env.NODE_ENV = 'test';

const test = require('node:test');
const { after } = require('node:test');
const assert = require('node:assert/strict');
const hooks = require('../core/hooks');
const settingsModel = require('../models/settings.model');
const postsModel = require('../models/posts.model');
const { generateSite } = require('../services/generator');
const cookieConsentPlugin = require('../../plugins/cookie-consent/index.js');

// Ugyanugy toltjuk be a plugint, ahogy a pluginLoader tenne induláskor.
cookieConsentPlugin.register(hooks);

const author = { sub: 'test-author', displayName: 'Teszt Szerző' };

test('cookie consent banner is absent by default (disabled)', async () => {
  await postsModel.create({ title: 'Nyilvanos poszt', contentMarkdown: 'Tartalom', status: 'published' }, author);
  await generateSite();

  const indexHtml = fs.readFileSync(path.join(tmpPublicDir, 'index.html'), 'utf8');
  assert.doesNotMatch(indexHtml, /agcms-cookie-consent/);
});

test('enabling cookie consent injects the banner into every generated page', async () => {
  await settingsModel.update({
    cookieConsent: {
      enabled: true,
      message: 'Egyedi süti szöveg <script>alert(1)</script>',
      acceptLabel: 'Rendben',
      learnMoreLabel: 'Tovabbi info',
      learnMoreUrl: 'https://example.com/adatvedelem',
    },
  });
  await generateSite();

  const indexHtml = fs.readFileSync(path.join(tmpPublicDir, 'index.html'), 'utf8');
  assert.match(indexHtml, /agcms-cookie-consent/);
  assert.match(indexHtml, /Rendben/);
  assert.match(indexHtml, /Tovabbi info/);
  assert.match(indexHtml, /https:\/\/example\.com\/adatvedelem/);

  // A felhasznalo altal megadott szoveg escapelve legyen - ne fusson bele nyers script tag.
  assert.doesNotMatch(indexHtml, /<script>alert\(1\)<\/script>/);
  assert.match(indexHtml, /&lt;script&gt;/);

  // A bejegyzes oldalon is megjelenik, nem csak a fooldalon.
  const postFiles = fs.readdirSync(tmpPublicDir).filter((f) => f.endsWith('.html') && f !== 'index.html');
  assert.equal(postFiles.length, 1);
  const postHtml = fs.readFileSync(path.join(tmpPublicDir, postFiles[0]), 'utf8');
  assert.match(postHtml, /agcms-cookie-consent/);
});

test('disabling cookie consent again removes the banner from a fresh build', async () => {
  await settingsModel.update({ cookieConsent: { enabled: false } });
  await generateSite();

  const indexHtml = fs.readFileSync(path.join(tmpPublicDir, 'index.html'), 'utf8');
  assert.doesNotMatch(indexHtml, /agcms-cookie-consent/);
});

after(() => {
  fs.rmSync(tmpDataDir, { recursive: true, force: true });
  fs.rmSync(tmpMediaDir, { recursive: true, force: true });
  fs.rmSync(tmpPublicDir, { recursive: true, force: true });
});
