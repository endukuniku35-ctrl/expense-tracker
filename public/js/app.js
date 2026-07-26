/**
 * App.js – Core SPA Router, Auth, Global State
 */

// ─── Global State ─────────────────────────────────
const App = {
  currentUser: null,
  currentView: 'dashboard',
  isAdmin: false,
  charts: {},
  modals: {},
  darkMode: false
};

// ─── API Helper ────────────────────────────────────
async function api(url, options = {}) {
  try {
    const res = await fetch(url, {
      headers: { 'Content-Type': 'application/json', ...options.headers },
      credentials: 'include',
      ...options
    });
    if (res.status === 401) {
      sessionStorage.clear();
      window.location.href = '/';
      return null;
    }
    return await res.json();
  } catch (err) {
    showToast('Connection error', 'Cannot reach the server.', 'error');
    return null;
  }
}

// ─── Toast Notifications ───────────────────────────
function showToast(title, message = '', type = 'info', duration = 4000) {
  const container = document.getElementById('toastContainer');
  const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
  const toast = document.createElement('div');
  toast.className = `toast-item ${type}`;
  toast.innerHTML = `
    <div class="toast-icon">${icons[type] || 'ℹ️'}</div>
    <div class="toast-content">
      <div class="toast-title">${title}</div>
      ${message ? `<div class="toast-message">${message}</div>` : ''}
    </div>
    <button onclick="this.parentElement.remove()" style="background:none;border:none;cursor:pointer;color:var(--text-muted);font-size:16px;margin-left:8px">×</button>
  `;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.animation = 'slideOutRight 0.3s ease forwards';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

// ─── Send Telegram Summary Report ─────────────────
async function sendTelegramSummary() {
  showToast('Telegram', 'Sending summary report to Telegram...', 'info');
  const res = await api('/api/reports/telegram-summary', { method: 'POST' });
  if (res && res.success) {
    showToast('Sent to Telegram ✈️', 'Summary report shared in Telegram group!', 'success');
  } else {
    showToast('Telegram Error', res?.message || 'Failed to send Telegram report.', 'error');
  }
}

// ─── Loading Overlay ───────────────────────────────
function showLoader() { document.getElementById('pageLoader').classList.add('show'); }
function hideLoader() { document.getElementById('pageLoader').classList.remove('show'); }

// ─── Format Currency ───────────────────────────────
function formatCurrency(amount) {
  return '₹' + Number(amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

// ─── Format Date ───────────────────────────────────
function formatDate(dateStr) {
  if (!dateStr || dateStr === '-') return '-';
  return new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

// ─── Time Ago ─────────────────────────────────────
function timeAgo(dateStr) {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now - date;
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return formatDate(dateStr);
}

// ─── Get Status Badge HTML ─────────────────────────
function statusBadge(status) {
  const map = {
    paid:    '<span class="badge-paid">🟢 Paid</span>',
    partial: '<span class="badge-partial">🟡 Partial</span>',
    pending: '<span class="badge-pending">🔴 Pending</span>',
  };
  return map[status] || `<span class="badge-cat">${status}</span>`;
}

// ─── Get Avatar Color Class ────────────────────────
function avatarClass(name) {
  const n = (name || '').toLowerCase();
  if (n.includes('jagan')) return 'avatar-jagan';
  if (n.includes('sagar')) return 'avatar-sagar';
  if (n.includes('prathap')) return 'avatar-prathap';
  if (n.includes('bharath')) return 'avatar-bharath';
  return 'avatar-jagan';
}

// ─── Sidebar Controls ──────────────────────────────
function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebarOverlay');
  sidebar.classList.toggle('open');
  overlay.classList.toggle('show');
}

function closeSidebar() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebarOverlay').classList.remove('show');
}

// ─── Dark Mode ─────────────────────────────────────
function toggleDarkMode() {
  App.darkMode = !App.darkMode;
  const html = document.documentElement;
  const icon = document.getElementById('themeIcon');
  if (App.darkMode) {
    html.setAttribute('data-theme', 'dark');
    icon.className = 'fas fa-sun';
    localStorage.setItem('theme', 'dark');
  } else {
    html.setAttribute('data-theme', 'light');
    icon.className = 'fas fa-moon';
    localStorage.setItem('theme', 'light');
  }
  // Refresh charts after theme change
  if (App.charts) {
    Object.values(App.charts).forEach(c => { if (c && c.update) c.update(); });
  }
}

// ─── Navigation ────────────────────────────────────
function navigateTo(view) {
  App.currentView = view;
  window.location.hash = view;

  // Update active nav item
  document.querySelectorAll('.nav-link-custom[data-view]').forEach(el => {
    el.classList.toggle('active', el.dataset.view === view);
  });

  // Update page title
  const titles = {
    dashboard: { title: 'Dashboard', breadcrumb: 'Overview' },
    members: { title: 'Members', breadcrumb: 'Team Members & Status' },
    expenses: { title: 'Expenses', breadcrumb: 'Expense Management' },
    payments: { title: 'Payment Status', breadcrumb: 'Track Payments' },
    reports: { title: 'Reports', breadcrumb: 'Analytics & Reports' },
    charts: { title: 'Charts', breadcrumb: 'Visual Analytics' },
    profile: { title: 'Profile', breadcrumb: 'Account Settings' },
  };

  const info = titles[view] || { title: view, breadcrumb: '' };
  document.getElementById('pageTitle').textContent = info.title;
  document.getElementById('pageBreadcrumb').textContent = info.breadcrumb;

  // Load view
  const content = document.getElementById('viewContent');
  switch (view) {
    case 'dashboard': loadDashboard(); break;
    case 'members': loadMembers(); break;
    case 'expenses': loadExpenses(); break;
    case 'payments': loadPayments(); break;
    case 'reports': loadReports(); break;
    case 'charts': loadCharts(); break;
    case 'profile': loadProfile(); break;
    default: loadDashboard();
  }

  // Close sidebar on mobile
  if (window.innerWidth < 992) closeSidebar();
}

// ─── Logout ────────────────────────────────────────
function showLogoutModal() {
  const modal = new bootstrap.Modal(document.getElementById('logoutModal'));
  modal.show();
}

document.getElementById('confirmLogoutBtn').addEventListener('click', async () => {
  showLoader();
  const data = await api('/api/auth/logout', { method: 'POST' });
  sessionStorage.clear();
  window.location.href = '/';
});

// ─── Initialize App ────────────────────────────────
async function initApp() {
  showLoader();

  // Restore theme
  const savedTheme = localStorage.getItem('theme') || 'light';
  if (savedTheme === 'dark') {
    App.darkMode = true;
    document.documentElement.setAttribute('data-theme', 'dark');
    document.getElementById('themeIcon').className = 'fas fa-sun';
  }

  // Theme toggle button
  document.getElementById('themeToggle').addEventListener('click', toggleDarkMode);

  // Verify session
  const authData = await api('/api/auth/me');
  if (!authData || !authData.success) {
    window.location.href = '/';
    return;
  }

  App.currentUser = authData.user;
  App.isAdmin = authData.user.role === 'admin';

  // Update UI with user info
  const { name, shortName, avatar, role } = authData.user;
  document.getElementById('sidebarAvatar').textContent = avatar;
  document.getElementById('sidebarName').textContent = name;
  document.getElementById('sidebarRole').textContent = role === 'admin' ? '👑 Administrator' : '👤 Member';
  document.getElementById('topbarAvatar').textContent = avatar;
  document.getElementById('topbarName').textContent = shortName;

  // Show notifications bell for admin
  if (App.isAdmin) {
    document.getElementById('notifWrap').style.display = 'flex';
    loadNotifications();
    // Set up notif button
    document.getElementById('notifBtn').addEventListener('click', (e) => {
      e.stopPropagation();
      document.getElementById('notifDropdown').classList.toggle('show');
    });
    document.addEventListener('click', () => {
      document.getElementById('notifDropdown').classList.remove('show');
    });
  }

  // Route from hash or default
  const hash = window.location.hash.replace('#', '') || 'dashboard';
  navigateTo(hash);

  hideLoader();
}

// ─── Init on DOMContentLoaded ─────────────────────
document.addEventListener('DOMContentLoaded', initApp);

// Handle browser back/forward
window.addEventListener('hashchange', () => {
  const view = window.location.hash.replace('#', '') || 'dashboard';
  navigateTo(view);
});

// Animate stat values
function animateCounter(element, target, prefix = '', suffix = '') {
  const duration = 1200;
  const start = performance.now();
  const startVal = 0;
  function tick(now) {
    const elapsed = now - start;
    const progress = Math.min(elapsed / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    const current = Math.round(startVal + (target - startVal) * eased);
    element.textContent = prefix + current.toLocaleString('en-IN') + suffix;
    if (progress < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}
