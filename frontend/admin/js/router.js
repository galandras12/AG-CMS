/**
 * Egyszeru hash-alapu router (#/dashboard, #/posts, #/posts/:id, ...).
 * Nincs kulso fuggoseg - a route-okat a page modulok regisztraljak.
 */
(function () {
  const routes = [];

  function route(pattern, handler) {
    const paramNames = [];
    const regexStr = pattern.replace(/:[^/]+/g, (m) => {
      paramNames.push(m.slice(1));
      return '([^/]+)';
    });
    routes.push({ regex: new RegExp(`^${regexStr}$`), paramNames, handler });
  }

  function currentPath() {
    const hash = location.hash.replace(/^#/, '');
    return hash || '/dashboard';
  }

  async function resolve() {
    const path = currentPath();
    for (const r of routes) {
      const match = path.match(r.regex);
      if (match) {
        const params = {};
        r.paramNames.forEach((name, i) => {
          params[name] = decodeURIComponent(match[i + 1]);
        });
        await r.handler(params);
        return;
      }
    }
    navigate('/dashboard');
  }

  function navigate(path) {
    if (location.hash.replace(/^#/, '') === path) {
      resolve();
    } else {
      location.hash = `#${path}`;
    }
  }

  function start() {
    window.addEventListener('hashchange', resolve);
    resolve();
  }

  window.AGCMS_ROUTER = { route, start, resolve, navigate };
})();
