window.AGCMS_PAGES = window.AGCMS_PAGES || {};

window.AGCMS_PAGES.personalization = async function renderPersonalization(container, params, ctx) {
  const { t, apiFetch, user } = ctx;
  const { escapeHtml, toast, readJsonSafe } = window.AGCMS_UI;
  const isAdmin = user.role === 'admin';

  container.innerHTML = `<p>${t('common.loading')}</p>`;
  const [settingsRes, widgetsRes, mediaRes] = await Promise.all([
    apiFetch('/api/settings'),
    apiFetch('/api/widgets'),
    apiFetch('/api/media'),
  ]);
  const { settings } = await settingsRes.json();
  const { widgets } = await widgetsRes.json();
  const { media } = await mediaRes.json();

  const disabledAttr = isAdmin ? '' : 'disabled';

  container.innerHTML = `
    <h1 class="agcms-page-title">${escapeHtml(t('personalization.title'))}</h1>
    ${!isAdmin ? `<p class="agcms-muted">${escapeHtml(t('common.adminOnly'))}</p>` : ''}

    <section class="agcms-card agcms-card--wide">
      <h2>${escapeHtml(t('personalization.siteInfoTitle'))}</h2>
      <form id="site-info-form" class="agcms-form">
        <label>${escapeHtml(t('personalization.fieldSiteName'))}
          <input type="text" name="siteName" value="${escapeHtml(settings.siteName)}" ${disabledAttr} />
        </label>
        <label>${escapeHtml(t('personalization.fieldSiteDescription'))}
          <textarea name="siteDescription" rows="2" ${disabledAttr}>${escapeHtml(settings.siteDescription)}</textarea>
        </label>
        <label>${escapeHtml(t('personalization.fieldSiteUrl'))}
          <input type="text" name="siteUrl" placeholder="https://example.com" value="${escapeHtml(settings.siteUrl || '')}" ${disabledAttr} />
        </label>
        <div class="agcms-form-row">
          ${renderMediaPicker('faviconUrl', t('personalization.fieldFavicon'), settings.faviconUrl)}
          ${renderMediaPicker('logoUrl', t('personalization.fieldLogo'), settings.logoUrl)}
          ${renderMediaPicker('bannerUrl', t('personalization.fieldBanner'), settings.bannerUrl)}
        </div>
        ${isAdmin ? `<div class="agcms-form-actions"><button type="submit" class="agcms-btn">${escapeHtml(t('common.save'))}</button></div>` : ''}
      </form>
    </section>

    <section class="agcms-card agcms-card--wide">
      <h2>${escapeHtml(t('personalization.seoTitle'))}</h2>
      <form id="seo-form" class="agcms-form">
        <label class="agcms-checkbox">
          <input type="checkbox" name="sitemapEnabled" ${settings.seo.sitemapEnabled ? 'checked' : ''} ${disabledAttr} />
          ${escapeHtml(t('personalization.sitemapEnabled'))}
        </label>
        <label class="agcms-checkbox">
          <input type="checkbox" name="robotsEnabled" ${settings.seo.robotsEnabled ? 'checked' : ''} ${disabledAttr} />
          ${escapeHtml(t('personalization.robotsEnabled'))}
        </label>
        <label>${escapeHtml(t('personalization.fieldRobotsTxt'))}
          <textarea name="robotsTxt" rows="4" class="agcms-mono" ${disabledAttr}>${escapeHtml(settings.seo.robotsTxt)}</textarea>
        </label>
        ${!settings.siteUrl ? `<p class="agcms-muted">${escapeHtml(t('personalization.sitemapNeedsUrl'))}</p>` : ''}
        ${isAdmin ? `<div class="agcms-form-actions"><button type="submit" class="agcms-btn">${escapeHtml(t('common.save'))}</button></div>` : ''}
      </form>
    </section>

    <section class="agcms-card agcms-card--wide">
      <h2>${escapeHtml(t('personalization.widgetsTitle'))}</h2>
      <form id="widget-add-form" class="agcms-form agcms-form--inline">
        <select name="type">
          <option value="text">${escapeHtml(t('personalization.widgetTypeText'))}</option>
          <option value="recentPosts">${escapeHtml(t('personalization.widgetTypeRecentPosts'))}</option>
          <option value="socialLinks">${escapeHtml(t('personalization.widgetTypeSocialLinks'))}</option>
        </select>
        <select name="region">
          <option value="sidebar">${escapeHtml(t('personalization.regionSidebar'))}</option>
          <option value="footer">${escapeHtml(t('personalization.regionFooter'))}</option>
        </select>
        <button type="submit" class="agcms-btn agcms-btn--sm">${escapeHtml(t('personalization.addWidget'))}</button>
      </form>
      <div id="widget-list" class="agcms-widget-list">
        ${widgets.map(renderWidgetCard).join('') || `<p class="agcms-muted">${escapeHtml(t('common.none'))}</p>`}
      </div>
    </section>
  `;

  function renderMediaPicker(field, label, value) {
    return `
      <label>${escapeHtml(label)}
        <select name="${field}" ${disabledAttr}>
          <option value="">${escapeHtml(t('common.none'))}</option>
          ${media
            .map((m) => `<option value="${escapeHtml(m.url)}" ${m.url === value ? 'selected' : ''}>${escapeHtml(m.originalName)}</option>`)
            .join('')}
        </select>
        ${value ? `<img class="agcms-media-preview" src="${escapeHtml(value)}" alt="" />` : ''}
      </label>
    `;
  }

  function renderWidgetCard(w) {
    return `
      <div class="agcms-widget-card" data-id="${w.id}">
        <div class="agcms-widget-card-header">
          <strong>${escapeHtml(labelForType(w.type))}</strong>
          <span class="agcms-tag">${w.region === 'footer' ? escapeHtml(t('personalization.regionFooter')) : escapeHtml(t('personalization.regionSidebar'))}</span>
          <button type="button" class="agcms-btn-ghost agcms-delete-widget" data-id="${w.id}">${escapeHtml(t('common.delete'))}</button>
        </div>
        <form class="agcms-widget-form" data-id="${w.id}">
          <label>${escapeHtml(t('personalization.fieldWidgetTitle'))}
            <input type="text" name="title" value="${escapeHtml(w.title || '')}" />
          </label>
          ${renderWidgetConfigFields(w)}
          <button type="submit" class="agcms-btn agcms-btn--sm">${escapeHtml(t('common.save'))}</button>
        </form>
      </div>
    `;
  }

  function labelForType(type) {
    if (type === 'text') return t('personalization.widgetTypeText');
    if (type === 'recentPosts') return t('personalization.widgetTypeRecentPosts');
    if (type === 'socialLinks') return t('personalization.widgetTypeSocialLinks');
    return type;
  }

  function renderWidgetConfigFields(w) {
    if (w.type === 'text') {
      return `<label>${escapeHtml(t('personalization.fieldWidgetContent'))}
        <textarea name="content" rows="3">${escapeHtml(w.config?.content || '')}</textarea>
      </label>`;
    }
    if (w.type === 'recentPosts') {
      return `<label>${escapeHtml(t('personalization.fieldWidgetCount'))}
        <input type="number" name="count" min="1" max="20" value="${w.config?.count || 5}" />
      </label>`;
    }
    if (w.type === 'socialLinks') {
      const linesValue = (w.config?.links || []).map((l) => `${l.label}|${l.url}`).join('\n');
      return `<label>${escapeHtml(t('personalization.fieldWidgetLinks'))}
        <textarea name="links" rows="3">${escapeHtml(linesValue)}</textarea>
      </label>`;
    }
    return '';
  }

  function readWidgetConfig(type, form) {
    if (type === 'text') return { content: form.content.value };
    if (type === 'recentPosts') return { count: parseInt(form.count.value, 10) || 5 };
    if (type === 'socialLinks') {
      const links = form.links.value
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => {
          const [label, url] = line.split('|').map((s) => (s || '').trim());
          return { label, url };
        });
      return { links };
    }
    return {};
  }

  if (isAdmin) {
    document.getElementById('site-info-form').addEventListener('submit', async (event) => {
      event.preventDefault();
      const form = event.target;
      await apiFetch('/api/settings', {
        method: 'PATCH',
        body: JSON.stringify({
          siteName: form.siteName.value,
          siteDescription: form.siteDescription.value,
          siteUrl: form.siteUrl.value.trim(),
          faviconUrl: form.faviconUrl.value,
          logoUrl: form.logoUrl.value,
          bannerUrl: form.bannerUrl.value,
        }),
      });
      toast(t('personalization.savedSuccess'));
      renderPersonalization(container, params, ctx);
    });

    document.getElementById('seo-form').addEventListener('submit', async (event) => {
      event.preventDefault();
      const form = event.target;
      await apiFetch('/api/settings', {
        method: 'PATCH',
        body: JSON.stringify({
          seo: {
            sitemapEnabled: form.sitemapEnabled.checked,
            robotsEnabled: form.robotsEnabled.checked,
            robotsTxt: form.robotsTxt.value,
          },
        }),
      });
      toast(t('personalization.savedSuccess'));
    });
  }

  document.getElementById('widget-add-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = event.target;
    const res = await apiFetch('/api/widgets', {
      method: 'POST',
      body: JSON.stringify({ type: form.type.value, region: form.region.value, config: {} }),
    });
    if (res.ok) renderPersonalization(container, params, ctx);
  });

  container.querySelectorAll('.agcms-delete-widget').forEach((btn) => {
    btn.addEventListener('click', async () => {
      if (!window.confirm(t('personalization.confirmDeleteWidget'))) return;
      await apiFetch(`/api/widgets/${btn.dataset.id}`, { method: 'DELETE' });
      renderPersonalization(container, params, ctx);
    });
  });

  container.querySelectorAll('.agcms-widget-form').forEach((form) => {
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const id = form.dataset.id;
      const widget = widgets.find((w) => w.id === id);
      const config = readWidgetConfig(widget.type, form);
      const res = await apiFetch(`/api/widgets/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ title: form.title.value, config }),
      });
      if (res.ok) {
        toast(t('personalization.savedSuccess'));
      } else {
        const data = await readJsonSafe(res);
        toast(data.error || t('common.error'), 'error');
      }
    });
  });
};
