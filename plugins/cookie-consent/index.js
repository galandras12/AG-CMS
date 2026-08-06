const settingsModel = require('../../server/models/settings.model');
const { escapeHtml } = require('../../server/services/templateEngine');

const STORAGE_KEY = 'agcms_cookie_consent';

function renderBanner(cfg) {
  const message = escapeHtml(cfg.message);
  const acceptLabel = escapeHtml(cfg.acceptLabel);
  const learnMoreLabel = escapeHtml(cfg.learnMoreLabel);
  const learnMoreUrl = escapeHtml(cfg.learnMoreUrl || '');

  const learnMoreLink = cfg.learnMoreUrl
    ? ` <a href="${learnMoreUrl}" target="_blank" rel="noopener" style="color:#8ab4ff;">${learnMoreLabel}</a>`
    : '';

  return `
<div id="agcms-cookie-consent" style="position:fixed;left:0;right:0;bottom:0;z-index:9999;background:rgba(20,20,24,.96);color:#f2f2f2;padding:1rem 1.25rem;display:flex;flex-wrap:wrap;gap:.75rem;align-items:center;justify-content:center;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:.9rem;box-shadow:0 -2px 12px rgba(0,0,0,.25);">
  <p style="margin:0;flex:1 1 320px;max-width:640px;">${message}${learnMoreLink}</p>
  <button id="agcms-cookie-consent-accept" type="button" style="background:#4f8cff;color:#fff;border:none;border-radius:6px;padding:.55rem 1.1rem;font-size:.9rem;cursor:pointer;flex-shrink:0;">${acceptLabel}</button>
</div>
<script>
(function () {
  var KEY = ${JSON.stringify(STORAGE_KEY)};
  var el = document.getElementById('agcms-cookie-consent');
  if (!el) return;
  try {
    if (localStorage.getItem(KEY) === 'accepted') {
      el.remove();
      return;
    }
  } catch (err) {
    // A localStorage nem minden bongeszoben/kontextusban elerheto (pl. privat mod) -
    // ilyenkor a sav minden betoltesnel megjelenik, de a lapon semmi nem torik el.
  }
  var btn = document.getElementById('agcms-cookie-consent-accept');
  if (btn) {
    btn.addEventListener('click', function () {
      try {
        localStorage.setItem(KEY, 'accepted');
      } catch (err) {
        // lasd feljebb
      }
      el.remove();
    });
  }
})();
</script>`;
}

/**
 * A render:beforeWrite hookra epul (server/services/generator.js hivja
 * meg minden legeneralt oldalra, iras elott). Ha a cookie-ertesito
 * ki van kapcsolva a Szemelyre szabas felulet Beallitasaiban
 * (settings.cookieConsent.enabled), semmit nem csinal.
 */
function register(hooks) {
  hooks.on('render:beforeWrite', (payload) => {
    const settings = settingsModel.get();
    const cfg = settings.cookieConsent;
    if (!cfg || !cfg.enabled || !payload.html.includes('</body>')) {
      return payload;
    }

    const banner = renderBanner(cfg);
    const html = payload.html.replace('</body>', `${banner}\n</body>`);
    return { ...payload, html };
  });
}

module.exports = { register };
