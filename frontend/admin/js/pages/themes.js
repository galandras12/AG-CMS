window.AGCMS_PAGES = window.AGCMS_PAGES || {};

window.AGCMS_PAGES.themes = async function renderThemes(container, params, ctx) {
  const { t, apiFetch, user } = ctx;
  const { escapeHtml, toast } = window.AGCMS_UI;
  const isAdmin = user.role === 'admin';

  container.innerHTML = `<p>${t('common.loading')}</p>`;
  const [themesRes, settingsRes] = await Promise.all([apiFetch('/api/themes'), apiFetch('/api/settings')]);
  const { themes } = await themesRes.json();
  const { settings } = await settingsRes.json();

  container.innerHTML = `
    <h1 class="agcms-page-title">${escapeHtml(t('themes.title'))}</h1>
    ${!isAdmin ? `<p class="agcms-muted">${escapeHtml(t('common.adminOnly'))}</p>` : ''}
    <div class="agcms-theme-grid">
      ${themes.map((theme) => renderThemeCard(theme, theme.id === settings.activeTheme)).join('')}
    </div>
  `;

  function renderThemeCard(theme, isActive) {
    return `
      <div class="agcms-theme-card ${isActive ? 'agcms-theme-card--active' : ''}">
        ${theme.previewUrl ? `<img src="${escapeHtml(theme.previewUrl)}" alt="${escapeHtml(theme.name)}" class="agcms-theme-preview" />` : ''}
        <div class="agcms-theme-card-body">
          <h2>${escapeHtml(theme.name)}</h2>
          <p class="agcms-muted">${escapeHtml(theme.description || '')}</p>
          <p class="agcms-theme-meta">${escapeHtml(t('themes.author'))}: ${escapeHtml(theme.author)} &middot; v${escapeHtml(theme.version)} &middot; ${escapeHtml(theme.updated)}</p>
          ${
            isActive
              ? `<span class="agcms-tag agcms-tag--active">${escapeHtml(t('themes.active'))}</span>`
              : isAdmin
                ? `<button type="button" class="agcms-btn agcms-btn--sm agcms-activate-theme" data-id="${theme.id}">${escapeHtml(t('themes.activate'))}</button>`
                : ''
          }
        </div>
      </div>
    `;
  }

  container.querySelectorAll('.agcms-activate-theme').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const res = await apiFetch('/api/settings', {
        method: 'PATCH',
        body: JSON.stringify({ activeTheme: btn.dataset.id }),
      });
      if (res.ok) {
        toast(t('themes.activated'));
        renderThemes(container, params, ctx);
      } else {
        toast(t('common.error'), 'error');
      }
    });
  });
};
