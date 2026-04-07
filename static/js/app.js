/* ============================================================
   app.js – Global App Utilities
   ============================================================ */

// ── Global fetch with auth redirect ──────────────────────────
async function apiFetch(url, options = {}) {
  const defaults = {
    headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
  };
  const merged = { ...defaults, ...options,
    headers: { ...defaults.headers, ...(options.headers || {}) }
  };
  const res = await fetch(url, merged);
  if (res.status === 401) { window.location.href = '/login'; return null; }
  return res;
}

// ── Notification toast ────────────────────────────────────────
function showToast(message, type = 'info', duration = 4000) {
  const container = document.getElementById('flash-container') ||
    (() => {
      const c = document.createElement('div');
      c.id = 'flash-container';
      c.className = 'fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-sm';
      document.body.appendChild(c);
      return c;
    })();

  const colors = {
    success:  'bg-emerald-900/90 border-emerald-700 text-emerald-100',
    error:    'bg-red-900/90 border-red-700 text-red-100',
    info:     'bg-blue-900/90 border-blue-700 text-blue-100',
    warning:  'bg-yellow-900/90 border-yellow-700 text-yellow-100',
  };
  const icons = { success: '✅', error: '⚠️', info: 'ℹ️', warning: '⚡' };

  const toast = document.createElement('div');
  toast.className = `flash-msg flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl border animate-fade-in ${colors[type] || colors.info}`;
  toast.innerHTML = `
    <span class="text-lg">${icons[type] || 'ℹ️'}</span>
    <span class="text-sm font-medium flex-1">${message}</span>
    <button onclick="this.parentElement.remove()" class="opacity-60 hover:opacity-100 text-lg ml-2">×</button>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity    = '0';
    toast.style.transition = 'opacity 0.4s';
    setTimeout(() => toast.remove(), 400);
  }, duration);
}

// ── Confirm Dialog ────────────────────────────────────────────
function confirmAction(message) {
  return new Promise(resolve => {
    const backdrop = document.createElement('div');
    backdrop.className = 'fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm';
    backdrop.innerHTML = `
      <div class="glass-card p-6 max-w-sm w-full mx-4 animate-slide-up">
        <p class="text-white font-medium mb-5 text-sm">${message}</p>
        <div class="flex gap-3">
          <button id="_cancel-btn" class="btn-secondary flex-1 py-2.5 text-sm">Cancel</button>
          <button id="_confirm-btn" class="btn-danger flex-1 py-2.5 text-sm justify-center">Confirm</button>
        </div>
      </div>`;
    document.body.appendChild(backdrop);
    backdrop.querySelector('#_cancel-btn').onclick  = () => { backdrop.remove(); resolve(false); };
    backdrop.querySelector('#_confirm-btn').onclick = () => { backdrop.remove(); resolve(true);  };
    backdrop.onclick = (e) => { if (e.target === backdrop) { backdrop.remove(); resolve(false); } };
  });
}

// ── Debounce ──────────────────────────────────────────────────
function debounce(fn, ms) {
  let t;
  return function(...args) {
    clearTimeout(t);
    t = setTimeout(() => fn.apply(this, args), ms);
  };
}

// ── Format date relative ──────────────────────────────────────
function timeAgo(dateStr) {
  const now  = new Date();
  const date = new Date(dateStr);
  const diff = Math.floor((now - date) / 1000);
  if (diff < 60)   return 'just now';
  if (diff < 3600) return `${Math.floor(diff/60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff/3600)}h ago`;
  return `${Math.floor(diff/86400)}d ago`;
}
