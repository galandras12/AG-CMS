const fs = require('fs');
const path = require('path');
const { marked } = require('marked');
const config = require('../config');
const logger = require('../core/logger');
const hooks = require('../core/hooks');
const settingsModel = require('../models/settings.model');
const postsModel = require('../models/posts.model');
const widgetsModel = require('../models/widgets.model');
const templateEngine = require('./templateEngine');
const widgetRenderer = require('./widgetRenderer');

const THEMES_DIR = path.join(config.rootDir, 'themes');

function stripLeadingSlash(value) {
  return (value || '').replace(/^\/+/, '');
}

function formatDate(iso) {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleDateString('hu-HU', { year: 'numeric', month: 'long', day: 'numeric' });
  } catch (err) {
    return iso;
  }
}

function copyDirSync(src, dest) {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDirSync(s, d);
    else fs.copyFileSync(s, d);
  }
}

/** Kiuriti a public/ mappat a build elott, de megtartja a .gitkeep-et (verziokezelt). */
function emptyPublicDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
  for (const entry of fs.readdirSync(dir)) {
    if (entry === '.gitkeep') continue;
    fs.rmSync(path.join(dir, entry), { recursive: true, force: true });
  }
}

function loadThemeMeta(themeId) {
  const metaPath = path.join(THEMES_DIR, themeId, 'theme.json');
  return JSON.parse(fs.readFileSync(metaPath, 'utf8'));
}

/**
 * Legenerálja a teljes statikus oldalt (public/) a kivalasztott tema es a
 * jelenlegi tartalom alapjan. Fut mentesenkent automatikusan (hookokon
 * keresztul, lasd server/core/autoBuild.js) es kezzel is (POST /api/build).
 */
async function generateSite() {
  await hooks.trigger('build:beforeGenerate', {});

  const settings = settingsModel.get();
  const themeId = settings.activeTheme;
  const themeDir = path.join(THEMES_DIR, themeId);
  if (!fs.existsSync(themeDir)) {
    throw new Error(`A kivalasztott tema nem talalhato: ${themeId}`);
  }
  const themeMeta = loadThemeMeta(themeId);

  const allPosts = await postsModel.list();
  const publishedPosts = allPosts
    .filter((p) => p.effectiveStatus === 'published')
    .sort((a, b) => new Date(b.publishAt || b.updatedAt) - new Date(a.publishAt || a.updatedAt));

  const widgets = await widgetsModel.list();
  const sidebarWidgets = widgets.filter((w) => w.region === 'sidebar');
  const footerWidgets = widgets.filter((w) => w.region === 'footer');

  emptyPublicDir(config.publicDir);
  copyDirSync(path.join(themeDir, 'assets'), path.join(config.publicDir, 'assets'));
  copyDirSync(config.mediaDir, path.join(config.publicDir, 'media'));

  const site = {
    name: settings.siteName,
    description: settings.siteDescription,
    faviconPath: settings.faviconUrl ? stripLeadingSlash(settings.faviconUrl) : '',
    logoPath: settings.logoUrl ? stripLeadingSlash(settings.logoUrl) : '',
    bannerPath: settings.bannerUrl ? stripLeadingSlash(settings.bannerUrl) : '',
    year: String(new Date().getFullYear()),
  };

  const sidebarWidgetsHtml = sidebarWidgets.map((w) => widgetRenderer.render(w, publishedPosts)).join('\n');
  const footerWidgetsHtml = footerWidgets.map((w) => widgetRenderer.render(w, publishedPosts)).join('\n');

  const postSummaries = publishedPosts.map((p) => ({
    title: p.title,
    excerpt: p.excerpt || '',
    url: `${p.slug}.html`,
    date: formatDate(p.publishAt || p.updatedAt),
    author: p.authorName || '',
  }));

  const indexTemplate = fs.readFileSync(path.join(themeDir, 'templates', 'index.html'), 'utf8');
  const postTemplate = fs.readFileSync(path.join(themeDir, 'templates', 'post.html'), 'utf8');

  const indexHtml = templateEngine.render(indexTemplate, {
    site,
    posts: postSummaries,
    sidebarWidgetsHtml,
    footerWidgetsHtml,
  });
  // A render:beforeWrite hookon keresztul pluginok (pl. cookie-consent)
  // tartalmat szurhatnak be minden legeneralt oldalba (tipikusan a
  // </body> ele), meg mielott a fajl lemezre iródik.
  const indexResult = await hooks.trigger('render:beforeWrite', { html: indexHtml, pageType: 'index', site });
  fs.writeFileSync(path.join(config.publicDir, 'index.html'), indexResult.html);

  for (let i = 0; i < publishedPosts.length; i += 1) {
    const post = publishedPosts[i];
    const contentHtml = marked.parse(post.contentMarkdown || '');
    const html = templateEngine.render(postTemplate, {
      site,
      post: {
        title: post.title,
        contentHtml,
        date: postSummaries[i].date,
        author: post.authorName || '',
      },
      sidebarWidgetsHtml,
      footerWidgetsHtml,
    });
    const postResult = await hooks.trigger('render:beforeWrite', { html, pageType: 'post', site, post });
    fs.writeFileSync(path.join(config.publicDir, `${post.slug}.html`), postResult.html);
  }

  if (settings.seo.robotsEnabled) {
    fs.writeFileSync(path.join(config.publicDir, 'robots.txt'), settings.seo.robotsTxt || '');
  }

  if (settings.seo.sitemapEnabled) {
    const base = (settings.siteUrl || '').replace(/\/+$/, '');
    const urls = [base ? `${base}/` : 'index.html', ...postSummaries.map((p) => (base ? `${base}/${p.url}` : p.url))];
    const xml =
      `<?xml version="1.0" encoding="UTF-8"?>\n` +
      `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
      urls.map((u) => `  <url><loc>${templateEngine.escapeHtml(u)}</loc></url>`).join('\n') +
      `\n</urlset>\n`;
    fs.writeFileSync(path.join(config.publicDir, 'sitemap.xml'), xml);
  }

  const result = {
    generatedAt: new Date().toISOString(),
    postCount: publishedPosts.length,
    theme: { id: themeMeta.id, name: themeMeta.name },
  };

  await hooks.trigger('build:afterGenerate', result);
  logger.info(`[generator] Statikus oldal generalva: ${publishedPosts.length} bejegyzes, tema: ${themeMeta.id}`);
  return result;
}

module.exports = { generateSite };
