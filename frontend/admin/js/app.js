(async function () {
  const { t, initI18n, setLang, currentLang } = window.AGCMS_I18N;
  const { checkServerReachable, apiFetch } = window.AGCMS_API;
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
    renderAuthenticated(user);
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
        <h1>${t('common.appName')}</h1>
        <p class="agcms-error">${t('auth.noConnection')}</p>
      </div>
    `;
  }

  function renderLogin() {
    root.innerHTML = `
      <div class="agcms-card agcms-card--center">
        <h1>${t('auth.loginTitle')}</h1>
        <form id="login-form">
          <label>${t('auth.username')}
            <input type="text" name="username" autocomplete="username" required />
          </label>
          <label>${t('auth.password')}
            <input type="password" name="password" autocomplete="current-password" required />
          </label>
          <button type="submit">${t('auth.loginButton')}</button>
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
      renderAuthenticated(data.user);
    } catch (err) {
      showLoginError(t('auth.noConnection'));
    }

    function showLoginError(message) {
      errorEl.textContent = message;
      errorEl.hidden = false;
    }
  }

  function renderAuthenticated(user) {
    root.innerHTML = `
      <div class="agcms-card">
        <h1>${t('dashboard.title')}</h1>
        <p>${escapeHtml(user.displayName)} (@${escapeHtml(user.username)}) - ${t('roles.' + user.role)}</p>
        <button id="logout-btn">${t('auth.logoutButton')}</button>
        <p class="agcms-muted">A teljes irányítópult a 3. fázisban készül el.</p>
      </div>
    `;
    document.getElementById('logout-btn').addEventListener('click', async () => {
      await apiFetch('/api/auth/logout', { method: 'POST' });
      renderLogin();
    });
  }

  function escapeHtml(value) {
    const div = document.createElement('div');
    div.textContent = value ?? '';
    return div.innerHTML;
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
