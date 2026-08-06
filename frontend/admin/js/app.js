(async function () {
  const { t, initI18n, setLang, currentLang } = window.AGCMS_I18N;
  const { checkServerReachable, apiFetch } = window.AGCMS_API;
  const { escapeHtml } = window.AGCMS_UI;
  const root = document.getElementById('app');

  await initI18n();
  document.title = t('common.appName');
  initThemeToggle();
  initLangToggle();

  const reachable = await checkServerReachable();
  if (!reachable) {
    renderNoConnection();
    return;
  }

  const user = await tryFetchMe();
  if (user) {
    await renderShell(user);
  } else {
    renderLogin();
  }

  async function tryFetchMe() {
    try {
      const res = await apiFetch('/api/auth/me');
      if (!res.ok) return null;
      const data = await res.json();
      return data.user;
    } catch (err) {
      return null;
    }
  }

  function renderNoConnection() {
    root.innerHTML = `
      <div class="agcms-card agcms-card--center">
        <h1>${escapeHtml(t('common.appName'))}</h1>
        <p class="agcms-error">${escapeHtml(t('auth.noConnection'))}</p>
      </div>
    `;
  }

  function renderLogin() {
    root.innerHTML = `
      <div class="agcms-card agcms-card--center">
        <h1>${escapeHtml(t('auth.loginTitle'))}</h1>
        <form id="login-form">
          <label>${escapeHtml(t('auth.username'))}
            <input type="text" name="username" autocomplete="username" required />
          </label>
          <label>${escapeHtml(t('auth.password'))}
            <input type="password" name="password" autocomplete="current-password" required />
          </label>
          <button type="submit">${escapeHtml(t('auth.loginButton'))}</button>
          <p id="login-error" class="agcms-error" hidden></p>
        </form>
      </div>
    `;
    document.getElementById('login-form').addEventListener('submit', onLoginSubmit);
  }

  async function onLoginSubmit(event) {
    event.preventDefault();
    const form = event.target;
    const errorEl = document.getElementById('login-error');
    errorEl.hidden = true;

    const username = form.username.value.trim();
    const password = form.password.value;

    try {
      const res = await apiFetch('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      });

      if (res.status === 429) {
        showLoginError(t('auth.rateLimited'));
        return;
      }
      if (!res.ok) {
        showLoginError(t('auth.loginError'));
        return;
      }

      const data = await res.json();
      await renderShell(data.user);
    } catch (err) {
      showLoginError(t('auth.noConnection'));
    }

    function showLoginError(message) {
      errorEl.textContent = message;
      errorEl.hidden = false;
    }
  }

  async function renderShell(user) {
    const menuRes = await apiFetch('/api/admin/menu');
    const { menu } = await menuRes.json();

    root.innerHTML = `
      <div class="agcms-shell">
        <aside class="agcms-sidebar">
          <nav id="sidebar-nav" class="agcms-nav"></nav>
          <div class="agcms-sidebar-footer">
            <div class="agcms-user-chip">${escapeHtml(user.displayName)} <span class="agcms-tag">${escapeHtml(t('roles.' + user.role))}</span></div>
            <button id="logout-btn" class="agcms-btn-ghost agcms-btn--block">${escapeHtml(t('nav.logout'))}</button>
          </div>
        </aside>
        <div class="agcms-content-wrap">
          <main id="page-content" class="agcms-main agcms-main--shell"></main>
        </div>
      </div>
    `;

    document.getElementById('logout-btn').addEventListener('click', async () => {
      await apiFetch('/api/auth/logout', { method: 'POST' });
      location.hash = '';
      renderLogin();
    });

    renderNav(menu);

    const pageContent = document.getElementById('page-content');
    const ctx = {
      t,
      apiFetch,
      user,
      navigate: window.AGCMS_ROUTER.navigate,
    };

    const router = window.AGCMS_ROUTER;
    router.route('/dashboard', (params) => runPage('dashboard', 'dashboard', params, ctx));
    router.route('/posts', (params) => runPage('posts', 'posts', params, ctx));
    router.route('/posts/:id', (params) => runPage('posts', 'posts', params, ctx));
    router.route('/posts/:id/edit', (params) => runPage('posts', 'posts', params, ctx));
    router.route('/media', (params) => runPage('media', 'media', params, ctx));
    router.route('/themes', (params) => runPage('themes', 'themes', params, ctx));
    router.route('/personalization', (params) => runPage('personalization', 'personalization', params, ctx));
    router.route('/users', (params) => runPage('users', 'users', params, ctx));
    router.start();

    async function runPage(navId, pageId, params, ctx2) {
      highlightNav(navId);
      const renderFn = window.AGCMS_PAGES[pageId];
      if (!renderFn) {
        pageContent.innerHTML = `<p class="agcms-error">${escapeHtml(t('common.error'))}</p>`;
        return;
      }
      await renderFn(pageContent, params, ctx2);
    }

    function highlightNav(navId) {
      document.querySelectorAll('#sidebar-nav .agcms-nav-link').forEach((el) => {
        el.classList.toggle('agcms-nav-link--active', el.dataset.navId === navId);
      });
    }
  }

  function renderNav(menu) {
    const nav = document.getElementById('sidebar-nav');
    nav.innerHTML = menu
      .map((item) => {
        if (item.url) {
          return `<a class="agcms-nav-link" href="${escapeHtml(item.url)}" target="_blank" rel="noopener"><span>${item.icon || ''}</span> ${escapeHtml(t(item.label))}</a>`;
        }
        return `<a class="agcms-nav-link" data-nav-id="${item.id}" href="#/${item.id}"><span>${item.icon || ''}</span> ${escapeHtml(t(item.label))}</a>`;
      })
      .join('');
  }

  function initThemeToggle() {
    const stored = localStorage.getItem('agcms_admin_theme') || 'dark';
    document.documentElement.dataset.theme = stored;
    const btn = document.getElementById('theme-toggle');
    btn.addEventListener('click', () => {
      const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
      document.documentElement.dataset.theme = next;
      localStorage.setItem('agcms_admin_theme', next);
    });
  }

  function initLangToggle() {
    const btn = document.getElementById('lang-toggle');
    btn.textContent = currentLang.toUpperCase();
    btn.addEventListener('click', async () => {
      const next = currentLang === 'hu' ? 'en' : 'hu';
      await setLang(next);
      location.reload();
    });
  }
})();
