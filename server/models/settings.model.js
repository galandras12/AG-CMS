const { getStore } = require('../core/store');

const DEFAULTS = {
  siteName: 'AG-CMS',
  siteDescription: '',
  faviconUrl: '',
  logoUrl: '',
  bannerUrl: '',
  activeTheme: 'modern-dark',
  seo: {
    sitemapEnabled: false,
    robotsEnabled: false,
    robotsTxt: 'User-agent: *\nAllow: /\n',
  },
};

const store = getStore('settings', DEFAULTS);

function get() {
  const data = store.read();
  return {
    ...DEFAULTS,
    ...data,
    seo: { ...DEFAULTS.seo, ...(data.seo || {}) },
  };
}

async function update(patch) {
  let updated = null;
  await store.update((data) => {
    const next = { ...DEFAULTS, ...data, ...patch };
    next.seo = { ...DEFAULTS.seo, ...(data.seo || {}), ...(patch.seo || {}) };
    updated = next;
    return next;
  });
  return updated;
}

module.exports = { get, update, DEFAULTS };
