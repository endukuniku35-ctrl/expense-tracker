/**
 * notifications.js – Notification System (Admin only)
 */

async function loadNotifications() {
  const data = await api('/api/notifications');
  if (!data) return;

  const { data: notifications, unreadCount } = data;

  // Update badge
  const badge = document.getElementById('notifCount');
  if (unreadCount > 0) {
    badge.textContent = unreadCount > 9 ? '9+' : unreadCount;
    badge.style.display = 'flex';
  } else {
    badge.style.display = 'none';
  }

  // Also update sidebar badge
  const sidebarNavItem = document.querySelector('.nav-link-custom[data-view="dashboard"]');
  if (sidebarNavItem && unreadCount > 0) {
    // Update notification count in nav if needed
  }

  // Render notifications list
  const list = document.getElementById('notifList');
  if (!notifications || notifications.length === 0) {
    list.innerHTML = `
      <div style="padding:32px;text-align:center;color:var(--text-muted)">
        <i class="fas fa-bell-slash" style="font-size:32px;margin-bottom:8px;display:block;opacity:0.4"></i>
        No notifications
      </div>
    `;
    return;
  }

  list.innerHTML = notifications.slice(0, 10).map(n => `
    <div class="notif-item ${n.read ? '' : 'unread'}" onclick="markRead('${n.id}')">
      <div class="notif-icon-wrap ${n.type}">
        <i class="fas ${n.type === 'expense' ? 'fa-receipt' : n.type === 'payment' ? 'fa-wallet' : 'fa-bell'}"></i>
      </div>
      <div style="flex:1;min-width:0">
        <div class="notif-text">${n.message}</div>
        <div class="notif-time">${timeAgo(n.timestamp)}</div>
      </div>
      ${!n.read ? `<div style="width:8px;height:8px;border-radius:50%;background:var(--primary);flex-shrink:0;margin-top:4px"></div>` : ''}
    </div>
  `).join('');
}

async function markRead(id) {
  await api(`/api/notifications/${id}/read`, { method: 'PUT' });
  await loadNotifications();
}

async function markAllRead() {
  await api('/api/notifications/mark-all-read', { method: 'PUT' });
  await loadNotifications();
  showToast('Done', 'All notifications marked as read.', 'success', 2000);
}

// Auto-refresh notifications every 30 seconds for admin
if (typeof App !== 'undefined' && App && App.isAdmin) {
  setInterval(() => {
    if (typeof App !== 'undefined' && App.isAdmin) loadNotifications();
  }, 30000);
}
