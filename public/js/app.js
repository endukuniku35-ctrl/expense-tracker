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

// ─── API Helper & Speed Cache ────────────────────────
const apiCache = new Map();

async function api(url, options = {}) {
  const method = (options.method || 'GET').toUpperCase();
  const cacheKey = url;

  // Serve instantly from cache if GET request within last 15 seconds
  if (method === 'GET' && !options.bypassCache) {
    const cached = apiCache.get(cacheKey);
    if (cached && (Date.now() - cached.time < 15000)) {
      return cached.data;
    }
  }

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
    const data = await res.json();
    if (method === 'GET' && data) {
      apiCache.set(cacheKey, { data, time: Date.now() });
    } else if (method !== 'GET') {
      // Invalidate cache on mutations (POST, PUT, DELETE)
      apiCache.clear();
    }
    return data;
  } catch (err) {
    showToast('Connection error', 'Cannot reach the server.', 'error');
    return null;
  }
}

function clearApiCache() {
  apiCache.clear();
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
  hideLoader();

  // Guard Admin-Only Views (Chat & Broadcast)
  if ((view === 'chat' || view === 'broadcast') && (!App.isAdmin || !App.currentUser || App.currentUser.role !== 'admin')) {
    showToast('Access Restricted 🔒', 'Roommate Chat & Admin Broadcasts are strictly restricted to Admin Jagan.', 'warning');
    if (view !== 'dashboard') navigateTo('dashboard');
    return;
  }

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
    chat: { title: 'Roommate Chat', breadcrumb: 'Group Messages & Reminders' },
    broadcast: { title: 'Admin Broadcast', breadcrumb: 'Send Announcements & Alerts' },
    reports: { title: 'Reports', breadcrumb: 'Analytics & Reports' },
    charts: { title: 'Charts', breadcrumb: 'Visual Analytics' },
    profile: { title: 'Profile', breadcrumb: 'Account Settings' },
  };

  const info = titles[view] || { title: view, breadcrumb: '' };
  document.getElementById('pageTitle').textContent = info.title;
  document.getElementById('pageBreadcrumb').textContent = info.breadcrumb;

  // Load view
  const content = document.getElementById('viewContent');
  const loaders = {
    dashboard: window.loadDashboard,
    members: window.loadMembers,
    expenses: window.loadExpenses,
    payments: window.loadPayments,
    chat: window.loadChatMessages,
    broadcast: window.loadAdminBroadcasts,
    reports: window.loadReports,
    charts: window.loadCharts,
    profile: window.loadProfile
  };

  const loaderFn = loaders[view] || window.loadDashboard;
  if (typeof loaderFn === 'function') {
    try {
      loaderFn();
    } catch (err) {
      console.error('Error executing loader for view ' + view + ':', err);
      if (content) {
        content.innerHTML = `<div style="padding:40px;text-align:center;color:var(--danger)">Error loading ${view}. <button class="btn-primary-custom" onclick="navigateTo('${view}')">Retry</button></div>`;
      }
    }
  } else if (content) {
    content.innerHTML = `<div style="padding:40px;text-align:center;color:var(--text-muted)">Loading ${view}... <button class="btn-primary-custom" onclick="navigateTo('${view}')">Retry</button></div>`;
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
  try {
    await api('/api/auth/logout', { method: 'POST' });
  } finally {
    hideLoader();
    sessionStorage.clear();
    window.location.href = '/';
  }
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
  App.isAdmin = authData.user.role === 'admin' || authData.user.role === 'super_admin' || authData.user.userid === '192472374';

  // Update UI with user info
  const { name, shortName, avatar, role, userid } = authData.user;
  const userPhoto = (userid === '192472374' || App.isAdmin) ? '/images/logo_brand.png' : null;

  const sidebarAv = document.getElementById('sidebarAvatar');
  if (sidebarAv) {
    if (userPhoto) sidebarAv.innerHTML = `<img src="${userPhoto}" style="width:40px;height:40px;border-radius:50%;object-fit:cover;border:2px solid var(--primary)" />`;
    else sidebarAv.textContent = avatar;
  }

  document.getElementById('sidebarName').textContent = name;
  document.getElementById('sidebarRole').textContent = App.isAdmin ? (role === 'super_admin' || userid === '192472374' ? '👑 Main Super Admin' : '👑 Administrator') : '👤 Member';

  const topbarAv = document.getElementById('topbarAvatar');
  if (topbarAv) {
    if (userPhoto) topbarAv.innerHTML = `<img src="${userPhoto}" style="width:28px;height:28px;border-radius:50%;object-fit:cover;border:2px solid var(--primary)" />`;
    else topbarAv.textContent = avatar;
  }
  document.getElementById('topbarName').textContent = shortName;

  // Show Admin-Only sidebar links for Admin Jagan only
  const chatNav = document.getElementById('roommateChatNavItem');
  if (chatNav) {
    chatNav.style.display = App.isAdmin ? 'block' : 'none';
  }
  const bcastNav = document.getElementById('adminBroadcastNavItem');
  if (bcastNav) {
    bcastNav.style.display = App.isAdmin ? 'block' : 'none';
  }

  // Show notifications bell for ALL logged-in users (Admin + Members)
  const notifWrap = document.getElementById('notifWrap');
  if (notifWrap) {
    notifWrap.style.display = 'flex';
    if (typeof loadNotifications === 'function') loadNotifications();
    const notifBtn = document.getElementById('notifBtn');
    if (notifBtn) {
      notifBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const dropdown = document.getElementById('notifDropdown');
        if (dropdown) dropdown.classList.toggle('show');
        if (typeof requestNotificationPermission === 'function') requestNotificationPermission();
      });
    }
    document.addEventListener('click', () => {
      const dropdown = document.getElementById('notifDropdown');
      if (dropdown) dropdown.classList.remove('show');
    });
  }

  // Route from hash or default
  const hash = window.location.hash.replace('#', '') || 'dashboard';
  navigateTo(hash);

  // Initialize Session Timing Controller (30-minute countdown)
  initSessionTiming(authData.sessionMaxAge);

  hideLoader();
}

// ─── Session Controller (7-Day Rolling Session, Hidden UI) ─────────────────────
let sessionTimerInterval = null;
let sessionRemainingSec = 7 * 24 * 3600; // 7 days
let lastActivityTime = Date.now();

function initSessionTiming(maxAgeMs = 604800000) {
  sessionRemainingSec = Math.floor((maxAgeMs || 604800000) / 1000);

  // Ensure timer badge is hidden from UI
  const badgeEl = document.getElementById('sessionTimerBadge');
  if (badgeEl) badgeEl.style.display = 'none';

  if (sessionTimerInterval) clearInterval(sessionTimerInterval);
  sessionTimerInterval = setInterval(tickSessionTimer, 10000);

  // Listen for active user interactions to silently renew session
  ['click', 'keydown', 'mousemove', 'scroll', 'touchstart'].forEach(evt => {
    window.addEventListener(evt, onUserActivity, { passive: true });
  });
}

function tickSessionTimer() {
  if (sessionRemainingSec <= 0) {
    clearInterval(sessionTimerInterval);
    sessionExpiredLogout();
    return;
  }
  sessionRemainingSec -= 10;
}

async function extendSession(quiet = true) {
  const res = await api('/api/auth/refresh-session', { method: 'POST' });
  if (res && res.success) {
    sessionRemainingSec = 7 * 24 * 3600; // Reset to 7 days
    lastActivityTime = Date.now();
  }
}

function onUserActivity() {
  const now = Date.now();
  // Silently refresh session on user activity if 10 minutes have passed
  if (now - lastActivityTime > 10 * 60 * 1000) {
    lastActivityTime = now;
    extendSession(true);
  }
}

async function sessionExpiredLogout() {
  if (warnModalInstance) {
    warnModalInstance.hide();
  }
  showLoader();
  await api('/api/auth/logout', { method: 'POST' });
  sessionStorage.clear();
  window.location.href = '/?expired=true';
}

function confirmLogout() {
  if (warnModalInstance) warnModalInstance.hide();
  showLogoutModal();
}

// ─── Init on DOMContentLoaded ─────────────────────
document.addEventListener('DOMContentLoaded', initApp);

// Handle browser back/forward
window.addEventListener('hashchange', () => {
  const view = window.location.hash.replace('#', '') || 'dashboard';
  navigateTo(view);
});

// ─── UPI QR Payment Controller ─────────────────────
window.activeQrPayment = null;

function openPayUpiQrModal(fromMemberId, fromMemberName, toMemberId, toMemberName, amount) {
  const adminUpiId = localStorage.getItem('admin_upi_id') || '8367047947@ybl';
  window.activeQrPayment = { fromMemberId, fromMemberName, toMemberId, toMemberName, amount };

  const upiDeepLink = `upi://pay?pa=${adminUpiId}&pn=${encodeURIComponent(toMemberName)}&am=${amount}&cu=INR&tn=${encodeURIComponent('Curry Expense Settlement')}`;
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(upiDeepLink)}`;

  document.getElementById('qrPayAmount').textContent = `₹${amount.toLocaleString('en-IN')}`;
  document.getElementById('qrReceiverName').textContent = `Kandukuri Jagan (Admin)`;
  document.getElementById('qrUpiId').textContent = adminUpiId;
  document.getElementById('upiQrImage').src = '/images/admin_phonepe_qr.png';

  const appLink = document.getElementById('upiAppLaunchBtn');
  if (appLink) appLink.href = upiDeepLink;

  const modalEl = document.getElementById('upiQrModal');
  if (modalEl) {
    new bootstrap.Modal(modalEl).show();
  }
}

async function confirmQrPaymentSent() {
  if (!window.activeQrPayment) return;

  const { fromMemberId, fromMemberName, toMemberId, toMemberName, amount } = window.activeQrPayment;
  const date = new Date().toISOString().split('T')[0];

  showLoader();
  try {
    if (App.isAdmin) {
      const res = await api('/api/balance/settle', {
        method: 'POST',
        body: JSON.stringify({ fromMemberId, fromMemberName, toMemberId, toMemberName, amount: parseFloat(amount), date, notes: 'UPI QR Payment (Confirmed)' })
      });
      if (res && res.success) {
        showToast('Payment Recorded! 🎉', `Settlement of ₹${parseFloat(amount).toLocaleString('en-IN')} recorded for ${fromMemberName}.`, 'success');
      } else {
        showToast('Notice', res?.message || 'Failed to update payment.', 'error');
      }
    } else {
      showToast('Payment Reported! 📲', `Thank you ${fromMemberName}! Admin Jagan has been notified to verify your ₹${parseFloat(amount).toLocaleString('en-IN')} payment.`, 'success');
    }
  } catch (e) {
    console.error('Error confirming QR payment:', e);
  } finally {
    hideLoader();
    const modalEl = document.getElementById('upiQrModal');
    if (modalEl) {
      const modal = bootstrap.Modal.getInstance(modalEl);
      if (modal) modal.hide();
    }
    window.activeQrPayment = null;
    const currentView = window.location.hash.replace('#', '') || 'dashboard';
    navigateTo(currentView);
  }
}

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
