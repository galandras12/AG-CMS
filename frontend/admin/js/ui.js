(function () {
  function escapeHtml(value) {
    const div = document.createElement('div');
    div.textContent = value ?? '';
    return div.innerHTML;
  }

  function formatBytes(bytes) {
    if (!bytes) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB'];
    let i = 0;
    let value = bytes;
    while (value >= 1024 && i < units.length - 1) {
      value /= 1024;
      i += 1;
    }
    return `${value.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
  }

  function formatDate(iso) {
    if (!iso) return '-';
    try {
      return new Date(iso).toLocaleString();
    } catch (err) {
      return iso;
    }
  }

  let toastTimeout = null;
  function toast(message, variant = 'success') {
    let el = document.getElementById('agcms-toast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'agcms-toast';
      document.body.appendChild(el);
    }
    el.textContent = message;
    el.className = `agcms-toast agcms-toast--${variant} agcms-toast--visible`;
    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => {
      el.classList.remove('agcms-toast--visible');
    }, 3000);
  }

  async function readJsonSafe(res) {
    try {
      return await res.json();
    } catch (err) {
      return {};
    }
  }

  window.AGCMS_UI = { escapeHtml, formatBytes, formatDate, toast, readJsonSafe };
})();
