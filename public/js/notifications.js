/**
 * notifications.js – Notification & Native Mobile System Push System
 */

let seenNotifIds = new Set();
let isFirstNotifLoad = true;

// Request Web & Android System Push Notification permissions
function requestNotificationPermission() {
  if ('Notification' in window && Notification.permission !== 'granted') {
    Notification.requestPermission().then(permission => {
      console.log('[Notification] Permission result:', permission);
      checkNotificationPermissionBanner();
    });
  }
}

// Check and render notification permission banner if not granted
function checkNotificationPermissionBanner() {
  if (!('Notification' in window)) return;
  const banner = document.getElementById('notifPermBanner');
  if (!banner) return;

  if (Notification.permission === 'default' || Notification.permission === 'denied') {
    banner.style.display = 'flex';
  } else {
    banner.style.display = 'none';
  }
}

// Trigger native Web / Android Mobile Push Notification
function triggerPushNotification(title, body) {
  if (!('Notification' in window)) return;

  if (Notification.permission === 'granted') {
    try {
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.ready.then(reg => {
          reg.showNotification(title, {
            body: body,
            icon: '/icons/icon-192.png',
            badge: '/icons/icon-192.png',
            vibrate: [300, 100, 300, 100, 300],
            tag: 'curry-notif-' + Date.now(),
            renotify: true,
            requireInteraction: true
          });
        });
      } else {
        new Notification(title, {
          body: body,
          icon: '/icons/icon-192.png'
        });
      }
    } catch (e) {
      console.log('[Notification] Push error:', e);
    }
  } else if (Notification.permission === 'default') {
    requestNotificationPermission();
  }
}

async function loadNotifications() {
  const data = await api('/api/notifications');
  if (!data) return;

  const { data: notifications, unreadCount } = data;

  // Update badge
  const badge = document.getElementById('notifCount');
  if (badge) {
    if (unreadCount > 0) {
      badge.textContent = unreadCount > 9 ? '9+' : unreadCount;
      badge.style.display = 'flex';
    } else {
      badge.style.display = 'none';
    }
  }

  // Check for new unread notifications to trigger Mobile System Push Notification
  if (notifications && notifications.length > 0) {
    notifications.forEach(n => {
      if (!n.read && !seenNotifIds.has(n.id)) {
        if (!isFirstNotifLoad) {
          triggerPushNotification('Curry Tracker 🍛', n.message);
        }
        seenNotifIds.add(n.id);
      }
    });
  }
  isFirstNotifLoad = false;

  // Render notifications list
  const list = document.getElementById('notifList');
  if (!list) return;

  if (!notifications || notifications.length === 0) {
    list.innerHTML = `
      <div style="padding:32px;text-align:center;color:var(--text-muted)">
        <i class="fas fa-bell-slash" style="font-size:32px;margin-bottom:8px;display:block;opacity:0.4"></i>
        No notifications
      </div>
    `;
    return;
  }

  list.innerHTML = notifications.slice(0, 15).map(n => `
    <div class="notif-item ${n.read ? '' : 'unread'}" onclick="markRead('${n.id}')">
      <div class="notif-icon-wrap ${n.type || 'info'}">
        <i class="fas ${n.type === 'expense' ? 'fa-receipt' : n.type === 'payment' ? 'fa-wallet' : 'fa-bell'}"></i>
      </div>
      <div style="flex:1;min-width:0">
        <div class="notif-text">${n.message}</div>
        <div class="notif-time">${typeof timeAgo === 'function' ? timeAgo(n.timestamp) : n.timestamp}</div>
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
  if (typeof showToast === 'function') {
    showToast('Done', 'All notifications marked as read.', 'success', 2000);
  }
}

// Request permission and start 10-second polling loop for all users
document.addEventListener('DOMContentLoaded', () => {
  requestNotificationPermission();
  checkNotificationPermissionBanner();
});

// Auto-refresh notifications every 10 seconds for ALL users
setInterval(() => {
  if (typeof App !== 'undefined' && App && App.user) {
    loadNotifications();
  }
}, 10000);
