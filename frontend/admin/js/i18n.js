/**
 * Nyelvi fajlokat (langs/*.json) toltő i18n segedmodul. Nem hardcode-olt
 * szoveg - minden felirat a langs/ mappabol jon, hianyzo kulcs eseten az
 * angol (en) ertekre esik vissza.
 */
(function () {
  const SUPPORTED = ['hu', 'en'];
  let translations = {};
  let currentLang = localStorage.getItem('agcms_lang') || 'hu';

  function get(obj, path) {
    return path.split('.').reduce((acc, key) => (acc && acc[key] !== undefined ? acc[key] : undefined), obj);
  }

  async function loadLang(lang) {
    const res = await fetch(`/langs/${lang}.json`, { cache: 'no-store' });
    if (!res.ok) throw new Error(`Nem talalhato nyelvi fajl: ${lang}`);
    return res.json();
  }

  function mergeWithFallback(primary, fallback) {
    const groups = new Set([...Object.keys(fallback), ...Object.keys(primary)]);
    const merged = {};
    for (const group of groups) {
      merged[group] = { ...(fallback[group] || {}), ...(primary[group] || {}) };
    }
    return merged;
  }

  async function initI18n() {
    const lang = SUPPORTED.includes(currentLang) ? currentLang : 'hu';
    let primary = await loadLang(lang);
    if (lang !== 'en') {
      try {
        const fallback = await loadLang('en');
        primary = mergeWithFallback(primary, fallback);
      } catch (err) {
        // Ha az angol fallback sem toltodik be, csak a primary nyelvvel megyunk tovabb.
      }
    }
    translations = primary;
    currentLang = lang;
    document.documentElement.lang = lang;
  }

  function t(key) {
    return get(translations, key) ?? key;
  }

  async function setLang(lang) {
    localStorage.setItem('agcms_lang', lang);
    currentLang = lang;
    await initI18n();
  }

  window.AGCMS_I18N = {
    initI18n,
    t,
    setLang,
    get currentLang() {
      return currentLang;
    },
    SUPPORTED,
  };
})();
