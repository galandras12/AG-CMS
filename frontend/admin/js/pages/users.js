window.AGCMS_PAGES = window.AGCMS_PAGES || {};

window.AGCMS_PAGES.users = async function renderUsers(container, params, ctx) {
  const { t, apiFetch, user: currentUser } = ctx;
  const { escapeHtml, toast, readJsonSafe } = window.AGCMS_UI;

  container.innerHTML = `<p>${t('common.loading')}</p>`;
  const res = await apiFetch('/api/users');
  if (res.status === 403) {
    container.innerHTML = `<p class="agcms-error">${escapeHtml(t('common.unauthorized'))}</p>`;
    return;
  }
  const { users } = await res.json();

  container.innerHTML = `
    <div class="agcms-page-header">
      <h1 class="agcms-page-title">${escapeHtml(t('users.title'))}</h1>
    </div>

    <form id="user-add-form" class="agcms-form agcms-card agcms-card--wide">
      <h2>${escapeHtml(t('users.newUser'))}</h2>
      <div class="agcms-form-row">
        <label>${escapeHtml(t('users.fieldUsername'))}<input type="text" name="username" required /></label>
        <label>${escapeHtml(t('users.fieldPassword'))}<input type="password" name="password" required minlength="8" /></label>
      </div>
      <div class="agcms-form-row">
        <label>${escapeHtml(t('users.fieldDisplayName'))}<input type="text" name="displayName" /></label>
        <label>${escapeHtml(t('users.fieldRole'))}
          <select name="role">
            <option value="editor">${escapeHtml(t('roles.editor'))}</option>
            <option value="admin">${escapeHtml(t('roles.admin'))}</option>
          </select>
        </label>
      </div>
      <div class="agcms-form-actions">
        <button type="submit" class="agcms-btn">${escapeHtml(t('common.create'))}</button>
      </div>
      <p id="user-add-error" class="agcms-error" hidden></p>
    </form>

    <table class="agcms-table">
      <thead>
        <tr>
          <th>${escapeHtml(t('users.fieldUsername'))}</th>
          <th>${escapeHtml(t('users.fieldDisplayName'))}</th>
          <th>${escapeHtml(t('users.fieldRole'))}</th>
          <th>${escapeHtml(t('users.fieldActive'))}</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        ${users.map(renderRow).join('')}
      </tbody>
    </table>
  `;

  function renderRow(u) {
    const isSelf = u.id === currentUser.sub;
    return `
      <tr data-id="${u.id}">
        <td>${escapeHtml(u.username)}</td>
        <td>${escapeHtml(u.displayName)}</td>
        <td>
          <select class="agcms-role-select" data-id="${u.id}" ${isSelf ? 'disabled' : ''}>
            <option value="editor" ${u.role === 'editor' ? 'selected' : ''}>${escapeHtml(t('roles.editor'))}</option>
            <option value="admin" ${u.role === 'admin' ? 'selected' : ''}>${escapeHtml(t('roles.admin'))}</option>
          </select>
        </td>
        <td>
          <input type="checkbox" class="agcms-active-toggle" data-id="${u.id}" ${u.active ? 'checked' : ''} ${isSelf ? 'disabled' : ''} />
        </td>
        <td>
          <button type="button" class="agcms-btn-ghost agcms-reset-password" data-id="${u.id}">${escapeHtml(t('users.resetPassword'))}</button>
          <button type="button" class="agcms-btn-ghost agcms-delete-user" data-id="${u.id}" ${isSelf ? 'disabled' : ''}>${escapeHtml(t('common.delete'))}</button>
        </td>
      </tr>
    `;
  }

  document.getElementById('user-add-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = event.target;
    const body = {
      username: form.username.value.trim(),
      password: form.password.value,
      displayName: form.displayName.value.trim() || undefined,
      role: form.role.value,
    };
    const createRes = await apiFetch('/api/users', { method: 'POST', body: JSON.stringify(body) });
    if (!createRes.ok) {
      const data = await readJsonSafe(createRes);
      const errorEl = document.getElementById('user-add-error');
      errorEl.textContent = data.error || t('common.error');
      errorEl.hidden = false;
      return;
    }
    renderUsers(container, params, ctx);
  });

  container.querySelectorAll('.agcms-role-select').forEach((select) => {
    select.addEventListener('change', async () => {
      const patchRes = await apiFetch(`/api/users/${select.dataset.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ role: select.value }),
      });
      if (!patchRes.ok) {
        const data = await readJsonSafe(patchRes);
        toast(data.error || t('users.cannotDeleteLastAdmin'), 'error');
        renderUsers(container, params, ctx);
        return;
      }
      toast(t('common.save'));
    });
  });

  container.querySelectorAll('.agcms-active-toggle').forEach((checkbox) => {
    checkbox.addEventListener('change', async () => {
      const patchRes = await apiFetch(`/api/users/${checkbox.dataset.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ active: checkbox.checked }),
      });
      if (!patchRes.ok) {
        const data = await readJsonSafe(patchRes);
        toast(data.error || t('users.cannotDeleteLastAdmin'), 'error');
        renderUsers(container, params, ctx);
      }
    });
  });

  container.querySelectorAll('.agcms-reset-password').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const newPassword = window.prompt(t('users.resetPassword') + ' (min 8 karakter):');
      if (!newPassword) return;
      const resetRes = await apiFetch(`/api/users/${btn.dataset.id}/password`, {
        method: 'POST',
        body: JSON.stringify({ password: newPassword }),
      });
      if (resetRes.ok) toast(t('common.save'));
    });
  });

  container.querySelectorAll('.agcms-delete-user').forEach((btn) => {
    btn.addEventListener('click', async () => {
      if (!window.confirm(t('users.confirmDelete'))) return;
      const deleteRes = await apiFetch(`/api/users/${btn.dataset.id}`, { method: 'DELETE' });
      if (!deleteRes.ok) {
        const data = await readJsonSafe(deleteRes);
        toast(data.error || t('common.error'), 'error');
        return;
      }
      renderUsers(container, params, ctx);
    });
  });
};
