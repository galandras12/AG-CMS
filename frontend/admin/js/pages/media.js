window.AGCMS_PAGES = window.AGCMS_PAGES || {};

window.AGCMS_PAGES.media = async function renderMedia(container, params, ctx) {
  const { t, apiFetch } = ctx;
  const { escapeHtml, toast, formatBytes, readJsonSafe } = window.AGCMS_UI;

  container.innerHTML = `<p>${t('common.loading')}</p>`;
  const res = await apiFetch('/api/media');
  const { media } = await res.json();

  container.innerHTML = `
    <div class="agcms-page-header">
      <h1 class="agcms-page-title">${escapeHtml(t('media.title'))}</h1>
    </div>
    <form id="upload-form" class="agcms-upload-form">
      <input type="file" name="file" accept="image/png,image/jpeg,image/gif,image/webp,image/svg+xml" required />
      <button type="submit" class="agcms-btn">${escapeHtml(t('media.upload'))}</button>
      <p id="upload-error" class="agcms-error" hidden></p>
    </form>
    ${
      media.length === 0
        ? `<p class="agcms-muted">${escapeHtml(t('media.empty'))}</p>`
        : `<div class="agcms-media-grid">
            ${media
              .map(
                (m) => `
              <figure class="agcms-media-item" data-id="${m.id}">
                <img src="${escapeHtml(m.url)}" alt="${escapeHtml(m.altText || m.originalName)}" loading="lazy" />
                <figcaption>
                  <span class="agcms-media-name" title="${escapeHtml(m.originalName)}">${escapeHtml(m.originalName)}</span>
                  <span class="agcms-muted">${formatBytes(m.size)}</span>
                  <input type="text" class="agcms-media-alt" placeholder="${escapeHtml(t('media.fieldAltText'))}" value="${escapeHtml(m.altText || '')}" data-id="${m.id}" />
                  <button type="button" class="agcms-btn-ghost agcms-delete-media" data-id="${m.id}">${escapeHtml(t('common.delete'))}</button>
                </figcaption>
              </figure>
            `
              )
              .join('')}
          </div>`
    }
  `;

  document.getElementById('upload-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = event.target;
    const file = form.file.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);

    const uploadRes = await apiFetch('/api/media', { method: 'POST', body: formData });
    const errorEl = document.getElementById('upload-error');
    if (!uploadRes.ok) {
      const data = await readJsonSafe(uploadRes);
      errorEl.textContent = data.error || t('media.invalidType');
      errorEl.hidden = false;
      return;
    }
    toast(t('media.uploadSuccess'));
    renderMedia(container, params, ctx);
  });

  container.querySelectorAll('.agcms-delete-media').forEach((btn) => {
    btn.addEventListener('click', async () => {
      if (!window.confirm(t('media.confirmDelete'))) return;
      await apiFetch(`/api/media/${btn.dataset.id}`, { method: 'DELETE' });
      renderMedia(container, params, ctx);
    });
  });

  container.querySelectorAll('.agcms-media-alt').forEach((input) => {
    input.addEventListener('change', async () => {
      await apiFetch(`/api/media/${input.dataset.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ altText: input.value }),
      });
      toast(t('personalization.savedSuccess'));
    });
  });
};
