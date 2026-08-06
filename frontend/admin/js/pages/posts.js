window.AGCMS_PAGES = window.AGCMS_PAGES || {};

window.AGCMS_PAGES.posts = async function renderPosts(container, params, ctx) {
  const { t, apiFetch, navigate } = ctx;
  const { escapeHtml, toast, formatDate } = window.AGCMS_UI;

  const STATUS_LABELS = {
    draft: t('posts.statusDraft'),
    scheduled: t('posts.statusScheduled'),
    published: t('posts.statusPublished'),
  };

  if (params.id === 'new' || params.id) {
    return renderEditor(params.id === 'new' ? null : params.id);
  }

  container.innerHTML = `<p>${t('common.loading')}</p>`;
  const res = await apiFetch('/api/posts');
  const { posts } = await res.json();

  container.innerHTML = `
    <div class="agcms-page-header">
      <h1 class="agcms-page-title">${escapeHtml(t('posts.title'))}</h1>
      <a href="#/posts/new" class="agcms-btn">${escapeHtml(t('posts.newPost'))}</a>
    </div>
    ${
      posts.length === 0
        ? `<p class="agcms-muted">${escapeHtml(t('posts.empty'))}</p>`
        : `<table class="agcms-table">
            <thead>
              <tr>
                <th>${escapeHtml(t('posts.fieldTitle'))}</th>
                <th>${escapeHtml(t('common.status'))}</th>
                <th></th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              ${posts
                .map(
                  (p) => `
                <tr>
                  <td><a href="#/posts/${p.id}/edit">${escapeHtml(p.title)}</a></td>
                  <td><span class="agcms-tag agcms-tag--${p.effectiveStatus}">${escapeHtml(STATUS_LABELS[p.effectiveStatus] || p.effectiveStatus)}</span></td>
                  <td>${formatDate(p.updatedAt)}</td>
                  <td><button type="button" class="agcms-btn-ghost agcms-delete-post" data-id="${p.id}">${escapeHtml(t('common.delete'))}</button></td>
                </tr>
              `
                )
                .join('')}
            </tbody>
          </table>`
    }
  `;

  container.querySelectorAll('.agcms-delete-post').forEach((btn) => {
    btn.addEventListener('click', async () => {
      if (!window.confirm(t('posts.confirmDelete'))) return;
      await apiFetch(`/api/posts/${btn.dataset.id}`, { method: 'DELETE' });
      toast(t('common.delete'));
      renderPosts(container, params, ctx);
    });
  });

  async function renderEditor(id) {
    let post = { title: '', slug: '', excerpt: '', contentMarkdown: '', status: 'draft', publishAt: '' };
    if (id) {
      container.innerHTML = `<p>${t('common.loading')}</p>`;
      const editRes = await apiFetch(`/api/posts/${id}`);
      if (!editRes.ok) {
        navigate('/posts');
        return;
      }
      const data = await editRes.json();
      post = data.post;
    }

    container.innerHTML = `
      <h1 class="agcms-page-title">${escapeHtml(id ? t('posts.editPost') : t('posts.newPost'))}</h1>
      <form id="post-form" class="agcms-form">
        <label>${escapeHtml(t('posts.fieldTitle'))}
          <input type="text" name="title" required value="${escapeHtml(post.title)}" />
        </label>
        <label>${escapeHtml(t('posts.fieldSlug'))}
          <input type="text" name="slug" value="${escapeHtml(post.slug || '')}" placeholder="auto" />
        </label>
        <label>${escapeHtml(t('posts.fieldExcerpt'))}
          <textarea name="excerpt" rows="2">${escapeHtml(post.excerpt || '')}</textarea>
        </label>
        <label>${escapeHtml(t('posts.fieldContent'))}
          <textarea name="contentMarkdown" rows="12" class="agcms-mono">${escapeHtml(post.contentMarkdown || '')}</textarea>
        </label>
        <div class="agcms-form-row">
          <label>${escapeHtml(t('posts.fieldStatus'))}
            <select name="status">
              <option value="draft" ${post.status === 'draft' ? 'selected' : ''}>${escapeHtml(t('posts.statusDraft'))}</option>
              <option value="scheduled" ${post.status === 'scheduled' ? 'selected' : ''}>${escapeHtml(t('posts.statusScheduled'))}</option>
              <option value="published" ${post.status === 'published' ? 'selected' : ''}>${escapeHtml(t('posts.statusPublished'))}</option>
            </select>
          </label>
          <label>${escapeHtml(t('posts.fieldPublishAt'))}
            <input type="datetime-local" name="publishAt" value="${post.publishAt ? post.publishAt.slice(0, 16) : ''}" />
          </label>
        </div>
        <div class="agcms-form-actions">
          <button type="submit" class="agcms-btn">${escapeHtml(t('common.save'))}</button>
          <a href="#/posts" class="agcms-btn-ghost">${escapeHtml(t('common.cancel'))}</a>
        </div>
        <p id="post-form-error" class="agcms-error" hidden></p>
      </form>
    `;

    document.getElementById('post-form').addEventListener('submit', async (event) => {
      event.preventDefault();
      const form = event.target;
      const body = {
        title: form.title.value.trim(),
        slug: form.slug.value.trim() || undefined,
        excerpt: form.excerpt.value,
        contentMarkdown: form.contentMarkdown.value,
        status: form.status.value,
        publishAt: form.publishAt.value ? new Date(form.publishAt.value).toISOString() : null,
      };
      const saveRes = await apiFetch(id ? `/api/posts/${id}` : '/api/posts', {
        method: id ? 'PATCH' : 'POST',
        body: JSON.stringify(body),
      });
      if (!saveRes.ok) {
        const data = await window.AGCMS_UI.readJsonSafe(saveRes);
        const errorEl = document.getElementById('post-form-error');
        errorEl.textContent = data.error || t('common.error');
        errorEl.hidden = false;
        return;
      }
      toast(t('posts.savedSuccess'));
      navigate('/posts');
    });
  }
};
