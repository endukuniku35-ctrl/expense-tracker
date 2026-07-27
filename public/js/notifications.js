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
window.requestNotificationPermission = async function requestNotificationPermission() {
  if ('Notification' in window) {
    try {
      const permission = await Notification.requestPermission();
      console.log('[Notification] Permission result:', permission);
      await registerPushSubscription(true);
      triggerPushNotification('Curry Tracker 🍛', '✅ Mobile Notifications Active! Status bar alerts enabled.');
      checkNotificationPermissionBanner();
    } catch (err) {
      await registerPushSubscription(true);
      triggerPushNotification('Curry Tracker 🍛', '✅ Mobile Notifications Active!');
    }
  } else {
    await registerPushSubscription();
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

window.registerPhoneForPushNotifications = async function registerPhoneForPushNotifications(isManualClick = false) {
  if (isManualClick && typeof showToast === 'function') {
    showToast('Registering Device... 📲', 'Requesting push notification permission...', 'info', 2000);
  }

  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;

  try {
    if (typeof Notification !== 'undefined' && Notification.permission !== 'granted') {
      const perm = await Notification.requestPermission().catch(() => 'denied');
      if (perm === 'denied') {
        if (isManualClick && typeof showToast === 'function') {
          showToast('Permission Blocked 🔒', 'Tap Tune/Lock icon to left of URL -> Permissions -> Notifications -> ALLOW', 'warning', 8000);
        }
        return;
      }
    }

    await navigator.serviceWorker.register('/sw.js', { scope: '/' });
    const reg = await navigator.serviceWorker.ready;
    const vapidRes = await api('/api/notifications/vapid-key');
    if (!vapidRes || !vapidRes.publicKey) return;

    const convertedKey = urlBase64ToUint8Array(vapidRes.publicKey);
    let sub = await reg.pushManager.getSubscription();

    if (!sub && typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      try {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: convertedKey
        });
      } catch (err) {
        console.error('[Push] Subscribe failed:', err);
      }
    }

    if (!sub) {
      console.warn('[Push] No push subscription available after registration. Permission:', Notification.permission);
      return;
    }

    const userid = (typeof App !== 'undefined' && App && App.currentUser) ? App.currentUser.userid : '192472374';
    const subscribeRes = await api('/api/notifications/subscribe', {
      method: 'POST',
      body: JSON.stringify({ ...sub.toJSON(), userid })
    });

    if (!subscribeRes || !subscribeRes.success) {
      console.error('[Push] Subscription save failed:', subscribeRes);
      return;
    }

    console.log('[Push] Subscription saved for', userid);

    if (isManualClick) {
      if (typeof showToast === 'function') {
        showToast('Phone Registered! 📲', 'Device registered for 24/7 background status bar notifications!', 'success', 5000);
      }
      playNotificationChime();
      triggerPushNotification('Curry Tracker 🍛', '📲 Phone Registered! Background status bar alerts active.');
    }
  } catch (e) {
    console.error('[Push] Registration error:', e);
  }
};

async function registerPushSubscription(isManualClick = false) {
  return window.registerPhoneForPushNotifications(isManualClick);
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

function triggerPushNotification(title, body) {
  playNotificationChime();

  if (typeof showToast === 'function') {
    showToast(title, body, 'info', 4000);
  }

  const iconUrl = 'https://expense-tracker-77br.onrender.com/icons/icon-192.png';
  const options = {
    body: body || 'New alert from Curry Tracker!',
    icon: iconUrl,
    vibrate: [500, 200, 500, 200, 500],
    tag: 'curry-notif-' + Date.now(),
    renotify: true,
    requireInteraction: true,
    silent: false,
    data: { url: 'https://expense-tracker-77br.onrender.com/dashboard.html#chat' }
  };

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistration().then(reg => {
      if (reg && reg.showNotification) {
        reg.showNotification(title || 'Curry Tracker 🍛', options).catch(() => {});
      } else {
        navigator.serviceWorker.register('/sw.js').then(newReg => {
          if (newReg && newReg.showNotification) {
            newReg.showNotification(title || 'Curry Tracker 🍛', options).catch(() => {});
          }
        }).catch(() => {});
      }
    }).catch(() => {});
  } else {
    try {
      if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
        new Notification(title || 'Curry Tracker 🍛', options);
      }
    } catch (e) {}
  }
}

async function loadNotifications() {
  const data = await api('/api/notifications', { bypassCache: true });
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
    if (isFirstNotifLoad) {
      notifications.forEach(n => seenNotifIds.add(n.id));
      isFirstNotifLoad = false;
    } else {
      notifications.forEach(n => {
        if (!seenNotifIds.has(n.id)) {
          seenNotifIds.add(n.id);
          triggerPushNotification('Curry Tracker 🍛', n.message);
        }
      });
    }
  }

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
