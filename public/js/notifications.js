/**
 * notifications.js – Real-Time Instant Notification & Mobile Push Engine
 * Built for Installed PWA / Android TWA apps (Managed by CurryTracker)
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
      console.log('[Notification] Permission result:', permission);
      registerPushSubscription();
      triggerPushNotification('Curry Tracker 🍛', '✅ Mobile Notifications Active! Status bar alerts enabled.');
      checkNotificationPermissionBanner();
    }).catch(() => {
      registerPushSubscription();
      triggerPushNotification('Curry Tracker 🍛', '✅ Mobile Notifications Active!');
    });
  } else {
    registerPushSubscription();
  }
};

function checkNotificationPermissionBanner() {
  const permBanner = document.getElementById('notifPermBanner');
  const blockBanner = document.getElementById('notifBlockedBanner');

  if (typeof Notification !== 'undefined') {
    if (Notification.permission === 'denied') {
      if (permBanner) permBanner.style.display = 'none';
      if (blockBanner) blockBanner.style.display = 'flex';
      return;
    } else if (Notification.permission === 'granted') {
      if (permBanner) permBanner.style.display = 'none';
      if (blockBanner) blockBanner.style.display = 'none';
      return;
    }
  }

  if (permBanner) permBanner.style.display = 'flex';
  if (blockBanner) blockBanner.style.display = 'none';
}

window.registerPhoneForPushNotifications = async function registerPhoneForPushNotifications() {
  if (typeof showToast === 'function') {
    showToast('Registering Device... 📲', 'Requesting push notification permission...', 'info', 2000);
  }

  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    if (typeof showToast === 'function') {
      showToast('Push Not Supported', 'PushManager is not supported in this browser.', 'warning');
    }
    return;
  }

  try {
    // Request permission directly in direct user click gesture
    if (typeof Notification !== 'undefined' && Notification.permission !== 'granted') {
      const perm = await Notification.requestPermission();
      if (perm === 'denied') {
        if (typeof showToast === 'function') {
          showToast('Permission Blocked 🔒', 'Tap Tune/Lock icon to left of URL -> Permissions -> Notifications -> ALLOW', 'warning', 8000);
        }
        return;
      }
    }

    const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
    const vapidRes = await api('/api/notifications/vapid-key');
    if (!vapidRes || !vapidRes.publicKey) {
      if (typeof showToast === 'function') showToast('Key Error', 'Could not fetch VAPID key', 'error');
      return;
    }

    const convertedKey = urlBase64ToUint8Array(vapidRes.publicKey);
    let sub = await reg.pushManager.getSubscription();

    if (!sub) {
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

      if (typeof showToast === 'function') {
        showToast('Phone Registered! 📲', 'Device registered for 24/7 background status bar notifications!', 'success', 5000);
      }
      playNotificationChime();
      triggerPushNotification('Curry Tracker 🍛', '📲 Phone Registered! Background status bar alerts active.');
    }
  } catch (e) {
    console.error('[Push] Registration error:', e);
    if (typeof showToast === 'function') {
      showToast('Registration Error', e.message || 'Could not register push', 'error');
    }
  }
};

async function registerPushSubscription() {
  return window.registerPhoneForPushNotifications();
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
        }
      });
    } else if (typeof Notification !== 'undefined') {
      new Notification(title, { body, icon: 'https://expense-tracker-77br.onrender.com/icons/icon-192.png' });
    }
  } catch (e) {
    console.log('[Notification] Push notice:', e);
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
  registerPushSubscription();
  checkNotificationPermissionBanner();
  loadNotifications();
});

// Auto-sync in-app notifications every 2 seconds for ALL users (logged in or guest mode)
setInterval(() => {
  loadNotifications();
}, 2000);
