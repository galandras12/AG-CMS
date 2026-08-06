window.AGCMS_PAGES = window.AGCMS_PAGES || {};

window.AGCMS_PAGES.dashboard = async function renderDashboard(container, params, ctx) {
  const { t, apiFetch } = ctx;
  const { escapeHtml, toast } = window.AGCMS_UI;

  container.innerHTML = `<p>${t('common.loading')}</p>`;

  const [layoutRes, dataRes] = await Promise.all([
    apiFetch('/api/dashboard/layout'),
    apiFetch('/api/dashboard/blocks-data'),
  ]);
  const { layout } = await layoutRes.json();
  const data = await dataRes.json();

  const BLOCK_TITLES = {
    recentPosts: t('dashboard.recentPostsTitle'),
    quickActions: t('dashboard.quickActionsTitle'),
    userSummary: t('dashboard.userSummaryTitle'),
    mediaSummary: t('dashboard.mediaSummaryTitle'),
  };

  const STATUS_LABELS = {
    draft: t('posts.statusDraft'),
    scheduled: t('posts.statusScheduled'),
    published: t('posts.statusPublished'),
  };

  function renderSystemBlock() {
    const sys = data.system;
    const changelogItems = sys.changelog?.items || [];
    return `
      <section class="agcms-block agcms-block--fixed">
        <h2>${escapeHtml(t('dashboard.systemBlockTitle'))}</h2>
        <p class="agcms-block-meta">${escapeHtml(sys.name)} v${escapeHtml(sys.version)} (${escapeHtml(sys.versionName)}) &middot; ${escapeHtml(sys.updated || '-')}</p>
        <h3>${escapeHtml(t('dashboard.changelogTitle'))}</h3>
        <ul class="agcms-changelog">
          ${changelogItems.map((item) => `<li>${escapeHtml(item)}</li>`).join('') || `<li class="agcms-muted">-</li>`}
        </ul>
      </section>
    `;
  }

  function renderBlockBody(blockId) {
    if (blockId === 'recentPosts') {
      if (!data.recentPosts.length) return `<p class="agcms-muted">${escapeHtml(t('dashboard.recentPostsEmpty'))}</p>`;
      return `<ul class="agcms-simple-list">${data.recentPosts
        .map((p) => `<li><a href="#/posts/${p.id}/edit">${escapeHtml(p.title)}</a> <span class="agcms-tag">${escapeHtml(STATUS_LABELS[p.status] || p.status)}</span></li>`)
        .join('')}</ul>`;
    }
    if (blockId === 'quickActions') {
      return `
        <div class="agcms-quick-actions">
          <a href="#/posts/new" class="agcms-btn agcms-btn--sm">${escapeHtml(t('dashboard.quickActionNewPost'))}</a>
          <a href="#/media" class="agcms-btn agcms-btn--sm">${escapeHtml(t('dashboard.quickActionUploadMedia'))}</a>
          <a href="#/personalization" class="agcms-btn agcms-btn--sm">${escapeHtml(t('dashboard.quickActionPersonalization'))}</a>
          <button type="button" id="dashboard-build-now" class="agcms-btn-ghost agcms-btn--sm">${escapeHtml(t('common.buildNow'))}</button>
        </div>
      `;
    }
    if (blockId === 'userSummary') {
      const s = data.userSummary;
      return `<p>${escapeHtml(t('roles.admin'))}: <strong>${s.admins}</strong> &middot; ${escapeHtml(t('roles.editor'))}: <strong>${s.editors}</strong> &middot; ${escapeHtml(t('common.status'))}: <strong>${s.total}</strong></p>`;
    }
    if (blockId === 'mediaSummary') {
      const s = data.mediaSummary;
      return `<p>${s.total} ${escapeHtml(t('media.title')).toLowerCase()} &middot; ${window.AGCMS_UI.formatBytes(s.totalSizeBytes)}</p>`;
    }
    return '';
  }

  function renderDraggableBlock(blockId) {
    return `
      <section class="agcms-block" draggable="true" data-block-id="${blockId}">
        <div class="agcms-block-header">
          <h2>${escapeHtml(BLOCK_TITLES[blockId] || blockId)}</h2>
          <button type="button" class="agcms-btn-ghost agcms-hide-block" data-block-id="${blockId}" title="${escapeHtml(t('dashboard.hideBlock'))}">&times;</button>
        </div>
        ${renderBlockBody(blockId)}
      </section>
    `;
  }

  const visibleOrder = layout.order.filter((id) => id !== 'system' && !layout.hidden.includes(id));
  const hiddenBlocks = layout.hidden;

  container.innerHTML = `
    <h1 class="agcms-page-title">${escapeHtml(t('dashboard.title'))}</h1>
    ${renderSystemBlock()}
    <p class="agcms-muted agcms-drag-hint">${escapeHtml(t('dashboard.dragHint'))}</p>
    <div id="sortable-blocks" class="agcms-block-grid">
      ${visibleOrder.map(renderDraggableBlock).join('')}
    </div>
    ${
      hiddenBlocks.length
        ? `<div class="agcms-hidden-blocks">
            <h3>${escapeHtml(t('dashboard.hiddenBlocksTitle'))}</h3>
            ${hiddenBlocks
              .map(
                (id) =>
                  `<button type="button" class="agcms-chip agcms-show-block" data-block-id="${id}">${escapeHtml(BLOCK_TITLES[id] || id)} +</button>`
              )
              .join('')}
          </div>`
        : ''
    }
  `;

  const sortableContainer = document.getElementById('sortable-blocks');
  wireDragAndDrop(sortableContainer, saveOrder);

  const buildBtn = document.getElementById('dashboard-build-now');
  if (buildBtn) {
    buildBtn.addEventListener('click', async () => {
      buildBtn.disabled = true;
      try {
        const res = await apiFetch('/api/build', { method: 'POST' });
        if (res.ok) {
          const { build } = await res.json();
          toast(`${t('common.buildNow')}: ${build.postCount} bejegyzés (${build.theme.name})`);
        } else {
          toast(t('common.error'), 'error');
        }
      } finally {
        buildBtn.disabled = false;
      }
    });
  }

  container.querySelectorAll('.agcms-hide-block').forEach((btn) => {
    btn.addEventListener('click', () => hideBlock(btn.dataset.blockId));
  });
  container.querySelectorAll('.agcms-show-block').forEach((btn) => {
    btn.addEventListener('click', () => showBlock(btn.dataset.blockId));
  });

  function currentOrderFromDom() {
    return ['system', ...[...sortableContainer.querySelectorAll('.agcms-block')].map((el) => el.dataset.blockId)];
  }

  async function saveOrder() {
    const order = currentOrderFromDom();
    await apiFetch('/api/dashboard/layout', {
      method: 'PATCH',
      body: JSON.stringify({ order, hidden: layout.hidden }),
    });
  }

  async function hideBlock(blockId) {
    const order = currentOrderFromDom();
    const hidden = [...layout.hidden, blockId];
    await apiFetch('/api/dashboard/layout', {
      method: 'PATCH',
      body: JSON.stringify({ order, hidden }),
    });
    renderDashboard(container, params, ctx);
  }

  async function showBlock(blockId) {
    const order = [...currentOrderFromDom(), blockId];
    const hidden = layout.hidden.filter((id) => id !== blockId);
    await apiFetch('/api/dashboard/layout', {
      method: 'PATCH',
      body: JSON.stringify({ order, hidden }),
    });
    renderDashboard(container, params, ctx);
  }

  function wireDragAndDrop(container2, onDrop) {
    if (!container2) return;
    let dragEl = null;
    container2.querySelectorAll('.agcms-block[draggable="true"]').forEach((block) => {
      block.addEventListener('dragstart', () => {
        dragEl = block;
        block.classList.add('agcms-block--dragging');
      });
      block.addEventListener('dragend', () => {
        block.classList.remove('agcms-block--dragging');
        dragEl = null;
        onDrop();
      });
      block.addEventListener('dragover', (e) => {
        e.preventDefault();
        if (!dragEl || dragEl === block) return;
        const rect = block.getBoundingClientRect();
        const before = e.clientY - rect.top < rect.height / 2;
        container2.insertBefore(dragEl, before ? block : block.nextSibling);
      });
    });
  }
};
