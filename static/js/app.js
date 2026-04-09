/* ============================================================
   app.js – Global shared UI helpers (mobile sidebar, toasts)
   ============================================================ */

document.addEventListener('DOMContentLoaded', function () {
  initMobileSidebar();
});

/* ── Mobile Sidebar Toggle ────────────────────────────────── */
function initMobileSidebar() {
  const openBtn   = document.getElementById('sidebar-open-btn');
  const closeBtn  = document.getElementById('sidebar-close-btn');
  const overlay   = document.getElementById('sidebar-overlay');
  const drawer    = document.getElementById('sidebar-drawer');

  if (!drawer) return; // page without sidebar

  function openSidebar() {
    drawer.classList.add('open');
    if (overlay) overlay.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function closeSidebar() {
    drawer.classList.remove('open');
    if (overlay) overlay.classList.remove('active');
    document.body.style.overflow = '';
  }

  if (openBtn)  openBtn.addEventListener('click', openSidebar);
  if (closeBtn) closeBtn.addEventListener('click', closeSidebar);
  if (overlay)  overlay.addEventListener('click', closeSidebar);

  // Close on link click (mobile nav)
  drawer.querySelectorAll('a.sidebar-link').forEach(link => {
    link.addEventListener('click', closeSidebar);
  });
}

/* ── Right Panel Toggle (Builder page) ───────────────────── */
function initRightPanelToggle() {
  const toggleBtn = document.getElementById('panel-toggle-btn');
  const panelDrawer = document.getElementById('right-panel-drawer');
  const panelOverlay = document.getElementById('panel-overlay');

  if (!toggleBtn || !panelDrawer) return;

  function openPanel() {
    panelDrawer.classList.add('open');
    if (panelOverlay) panelOverlay.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function closePanel() {
    panelDrawer.classList.remove('open');
    if (panelOverlay) panelOverlay.classList.remove('active');
    document.body.style.overflow = '';
  }

  toggleBtn.addEventListener('click', openPanel);
  if (panelOverlay) panelOverlay.addEventListener('click', closePanel);

  const drawerCloseBtn = document.getElementById('panel-drawer-close');
  if (drawerCloseBtn) drawerCloseBtn.addEventListener('click', closePanel);
}

/* ── Toast Notifications ──────────────────────────────────── */
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const colors = {
    success: 'bg-emerald-900/90 border-emerald-700 text-emerald-100',
    error:   'bg-red-900/90 border-red-700 text-red-100',
    info:    'bg-blue-900/90 border-blue-700 text-blue-100',
  };
  const icons = { success: '✅', error: '⚠️', info: 'ℹ️' };

  const toast = document.createElement('div');
  toast.className = `flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl border animate-fade-in ${colors[type] || colors.info}`;
  toast.innerHTML = `
    <span class="text-lg">${icons[type] || icons.info}</span>
    <span class="text-sm font-medium flex-1">${message}</span>
    <button class="ml-auto opacity-60 hover:opacity-100 text-lg" onclick="this.parentElement.remove()">×</button>
  `;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.5s';
    setTimeout(() => toast.remove(), 500);
  }, 4000);
}
