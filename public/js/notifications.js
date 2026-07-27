/**
 * notifications.js – Real-Time Instant Notification & Mobile Push Engine
 */

let seenNotifIds = new Set();
let isFirstNotifLoad = true;

// Web Audio API Synthesizer Notification Chime
function playNotificationChime() {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();

    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc1.type = 'sine';
    osc2.type = 'sine';
    osc1.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    osc2.frequency.setValueAtTime(880.00, ctx.currentTime + 0.1); // A5

    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);

    osc1.start(ctx.currentTime);
    osc2.start(ctx.currentTime + 0.1);
    osc1.stop(ctx.currentTime + 0.4);
    osc2.stop(ctx.currentTime + 0.4);
  } catch (e) {
    console.log('[Audio] Chime notice:', e);
  }
}

// Request Web & Android System Push Notification permissions
window.requestNotificationPermission = function requestNotificationPermission() {
  if ('Notification' in window) {
    Notification.requestPermission().then(permission => {
      console.log('[Notification] Permission:', permission);
      checkNotificationPermissionBanner();
      if (permission === 'granted') {
        registerPushSubscription();
        triggerPushNotification('Curry Tracker 🍛', '✅ Mobile Notifications Enabled! Status bar alerts are active.');
      } else if (permission === 'denied') {
        if (typeof showToast === 'function') {
          showToast('Notifications Blocked in Browser 🔒', 'Tap the Lock icon 🔒 next to the web address -> Site Settings -> Notifications -> ALLOW!', 'warning', 8000);
        }
      }
    });
  }
};

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

// Register VAPID Web Push Subscription on Android devices
async function registerPushSubscription() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
  try {
    const reg = await navigator.serviceWorker.ready;
    const vapidRes = await api('/api/notifications/vapid-key');
    if (!vapidRes || !vapidRes.publicKey) return;

    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      const convertedKey = urlBase64ToUint8Array(vapidRes.publicKey);
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertedKey
      });
    }

    if (sub) {
      const userid = (typeof App !== 'undefined' && App && App.currentUser) ? App.currentUser.userid : '192472374';
      await api('/api/notifications/subscribe', {
        method: 'POST',
        body: JSON.stringify({ ...sub.toJSON(), userid })
      });
    }
  } catch (e) {
    console.log('[Push] Subscription notice:', e);
  }
}

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

window.sendTestMobilePush = async function sendTestMobilePush() {
  showToast('Testing Push... 🔔', 'Sending test push notification to mobile status bar...', 'info');
  playNotificationChime();
  triggerPushNotification('Curry Tracker 🍛', '📲 Test Notification: Status bar notifications are working 100% on your Android phone!');
  
  const res = await api('/api/notifications/test-push', { method: 'POST' });
  if (res && res.success) {
    showToast('Push Sent! 📲', res.message, 'success');
  } else {
    showToast('Push Error', res?.message || 'Could not send test push', 'error');
  }
};

// Trigger native Web / Android Mobile Push Notification
function triggerPushNotification(title, body) {
  playNotificationChime();

  if (typeof showToast === 'function') {
    showToast(title, body, 'info', 4000);
  }

  if (!('Notification' in window)) return;

  if (Notification.permission === 'granted') {
    try {
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.ready.then(reg => {
          if (reg && reg.showNotification) {
            reg.showNotification(title, {
              body: body,
              icon: 'https://expense-tracker-77br.onrender.com/icons/icon-192.png',
              badge: 'https://expense-tracker-77br.onrender.com/icons/icon-192.png',
              vibrate: [300, 100, 300, 100, 300],
              tag: 'curry-notif-' + Date.now(),
              renotify: true,
              data: { url: 'https://expense-tracker-77br.onrender.com/dashboard.html#chat' }
            }).catch(() => {
              if (navigator.serviceWorker.controller) {
                navigator.serviceWorker.controller.postMessage({ type: 'SHOW_NOTIFICATION', title, body });
              }
            });
          } else if (navigator.serviceWorker.controller) {
            navigator.serviceWorker.controller.postMessage({ type: 'SHOW_NOTIFICATION', title, body });
          } else {
            new Notification(title, { body, icon: 'https://expense-tracker-77br.onrender.com/icons/icon-192.png' });
          }
        });
      } else {
        new Notification(title, { body, icon: 'https://expense-tracker-77br.onrender.com/icons/icon-192.png' });
      }
    } catch (e) {
      console.log('[Notification] Push error:', e);
    }
  }
}

async function loadNotifications() {
  const data = await api('/api/notifications');
  if (!data) return;

  const { data: notifications, unreadCount } = data;

  // Update badge in topbar
  const badge = document.getElementById('notifCount');
  if (badge) {
    if (unreadCount > 0) {
      badge.textContent = unreadCount > 9 ? '9+' : unreadCount;
      badge.style.display = 'flex';
    } else {
      badge.style.display = 'none';
    }
  }

  // Check for new notifications to trigger instant Mobile Push Notification & Chime
  if (notifications && notifications.length > 0) {
    notifications.forEach(n => {
      if (!seenNotifIds.has(n.id)) {
        if (!isFirstNotifLoad || !n.read) {
          triggerPushNotification('Curry Tracker 🍛', n.message);
        }
        seenNotifIds.add(n.id);
      }
    });
  }
  isFirstNotifLoad = false;

  // Render notifications list in topbar dropdown
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
        <i class="fas ${n.type === 'expense' ? 'fa-receipt' : n.type === 'payment' ? 'fa-wallet' : n.type === 'message' ? 'fa-comment' : 'fa-bell'}"></i>
      </div>
      <div style="flex:1;min-width:0">
        <div class="notif-text">${escapeHtml(n.message)}</div>
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

document.addEventListener('DOMContentLoaded', () => {
  checkNotificationPermissionBanner();
});

setInterval(() => {
  if (typeof App !== 'undefined' && App && App.currentUser) {
    loadNotifications();
  }
}, 2000);
