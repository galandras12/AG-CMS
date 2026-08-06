const { getStore } = require('../core/store');
const hooks = require('../core/hooks');

const DEFAULTS = {
  siteName: 'AG-CMS',
  siteDescription: '',
  siteUrl: '',
  faviconUrl: '',
  logoUrl: '',
  bannerUrl: '',
  activeTheme: 'modern-minimal-darkgray',
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

  await hooks.trigger('settings:afterUpdate', updated);
  return updated;
}

module.exports = { get, update, DEFAULTS };
