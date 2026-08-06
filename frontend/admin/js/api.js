/**
 * A backend elerhetoseget config/connection.json-bol olvassa be induláskor,
 * SOHA nincs hardcode-olva az URL. Ha a szerver nem elerheto, a hivo kodnak
 * kell megjelenitenie a "Nincs kapcsolat" allapotot.
 */
(function () {
  let cachedBackendUrl = null;

  async function getBackendUrl() {
    if (cachedBackendUrl) return cachedBackendUrl;
    const res = await fetch('/config/connection.json', { cache: 'no-store' });
    if (!res.ok) throw new Error('A config/connection.json nem olvashato.');
    const data = await res.json();
    if (!data.backendUrl) throw new Error('A connection.json nem tartalmaz backendUrl-t.');
    cachedBackendUrl = data.backendUrl.replace(/\/+$/, '');
    return cachedBackendUrl;
  }

  async function checkServerReachable() {
    try {
      const backendUrl = await getBackendUrl();
      const res = await fetch(`${backendUrl}/api/health`, { cache: 'no-store' });
      return res.ok;
    } catch (err) {
      return false;
    }
  }

  async function apiFetch(path, options = {}) {
    const backendUrl = await getBackendUrl();
    return fetch(`${backendUrl}${path}`, {
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      ...options,
    });
  }

  window.AGCMS_API = { getBackendUrl, checkServerReachable, apiFetch };
})();
