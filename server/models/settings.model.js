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
  cookieConsent: {
    enabled: false,
    message:
      'Ez a weboldal cookie-kat (sütiket) használ a működéshez és a felhasználói élmény javításához. Az oldal további használatával elfogadod a cookie-k használatát.',
    acceptLabel: 'Elfogadom',
    learnMoreLabel: 'Részletek',
    learnMoreUrl: '',
  },
};

const store = getStore('settings', DEFAULTS);

function get() {
  const data = store.read();
  return {
    ...DEFAULTS,
    ...data,
    seo: { ...DEFAULTS.seo, ...(data.seo || {}) },
    cookieConsent: { ...DEFAULTS.cookieConsent, ...(data.cookieConsent || {}) },
  };
}

async function update(patch) {
  let updated = null;
  await store.update((data) => {
    const next = { ...DEFAULTS, ...data, ...patch };
    next.seo = { ...DEFAULTS.seo, ...(data.seo || {}), ...(patch.seo || {}) };
    next.cookieConsent = { ...DEFAULTS.cookieConsent, ...(data.cookieConsent || {}), ...(patch.cookieConsent || {}) };
    updated = next;
    return next;
  });

  await hooks.trigger('settings:afterUpdate', updated);
  return updated;
}

module.exports = { get, update, DEFAULTS };
