const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');

const tmpDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agcms-gen-data-'));
const tmpMediaDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agcms-gen-media-'));
const tmpPublicDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agcms-gen-public-'));
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
const postsModel = require('../models/posts.model');
const settingsModel = require('../models/settings.model');
const widgetsModel = require('../models/widgets.model');
const { generateSite } = require('../services/generator');

const author = { sub: 'test-author', displayName: 'Teszt Szerző' };

test('generateSite() only publishes "published" posts and writes flat public/<slug>.html files', async () => {
  await postsModel.create({ title: 'Publikus poszt', contentMarkdown: '# Cím\n\nSzöveg.', status: 'published' }, author);
  await postsModel.create({ title: 'Piszkozat poszt', contentMarkdown: 'Titok', status: 'draft' }, author);

  const result = await generateSite();
  assert.equal(result.postCount, 1);

  const indexHtml = fs.readFileSync(path.join(tmpPublicDir, 'index.html'), 'utf8');
  assert.match(indexHtml, /Publikus poszt/);
  assert.doesNotMatch(indexHtml, /Piszkozat poszt/);

  const postFiles = fs.readdirSync(tmpPublicDir).filter((f) => f.endsWith('.html') && f !== 'index.html');
  assert.equal(postFiles.length, 1);

  const postHtml = fs.readFileSync(path.join(tmpPublicDir, postFiles[0]), 'utf8');
  assert.match(postHtml, /<h1>Publikus poszt<\/h1>/);
  // A markdown tartalom valodi HTML-le legyen konvertalva.
  assert.match(postHtml, /<h1>Cím<\/h1>/);
});

test('robots.txt and sitemap.xml are only written when enabled in settings', async () => {
  await settingsModel.update({
    siteUrl: 'https://example.com',
    seo: { robotsEnabled: false, sitemapEnabled: false },
  });
  await generateSite();
  assert.equal(fs.existsSync(path.join(tmpPublicDir, 'robots.txt')), false);
  assert.equal(fs.existsSync(path.join(tmpPublicDir, 'sitemap.xml')), false);

  await settingsModel.update({
    seo: { robotsEnabled: true, sitemapEnabled: true, robotsTxt: 'User-agent: *\nDisallow:\n' },
  });
  await generateSite();

  const robots = fs.readFileSync(path.join(tmpPublicDir, 'robots.txt'), 'utf8');
  assert.match(robots, /Disallow:/);

  const sitemap = fs.readFileSync(path.join(tmpPublicDir, 'sitemap.xml'), 'utf8');
  assert.match(sitemap, /<urlset/);
  assert.match(sitemap, /https:\/\/example\.com\//);
});

test('a "index" titled post never overwrites index.html (reserved slug)', async () => {
  const post = await postsModel.create({ title: 'Index', status: 'published' }, author);
  assert.notEqual(post.slug, 'index');

  await generateSite();
  const indexHtml = fs.readFileSync(path.join(tmpPublicDir, 'index.html'), 'utf8');
  // Az index.html tovabbra is a listazo oldal, nem a "Index" cimu poszt tartalma.
  assert.match(indexHtml, /post-card|post-excerpt|<main/);
});

test('widgets render into the generated pages', async () => {
  await widgetsModel.create({ type: 'text', title: 'Rólunk', config: { content: 'Szia **világ**' }, region: 'sidebar' });
  await generateSite();

  const indexHtml = fs.readFileSync(path.join(tmpPublicDir, 'index.html'), 'utf8');
  assert.match(indexHtml, /Rólunk/);
  assert.match(indexHtml, /<strong>világ<\/strong>/);
});

test('switching theme changes which template renders the site', async () => {
  await settingsModel.update({ activeTheme: 'solid-light' });
  await generateSite();
  const solidLightHtml = fs.readFileSync(path.join(tmpPublicDir, 'index.html'), 'utf8');
  assert.match(solidLightHtml, /widgets-row/);

  await settingsModel.update({ activeTheme: 'modern-trendy-black' });
  await generateSite();
  const blackHtml = fs.readFileSync(path.join(tmpPublicDir, 'index.html'), 'utf8');
  assert.match(blackHtml, /site-hero/);
});

after(() => {
  fs.rmSync(tmpDataDir, { recursive: true, force: true });
  fs.rmSync(tmpMediaDir, { recursive: true, force: true });
  fs.rmSync(tmpPublicDir, { recursive: true, force: true });
});
