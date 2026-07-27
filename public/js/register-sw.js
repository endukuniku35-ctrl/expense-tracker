/**
 * register-sw.js – Automatic Service Worker & VAPID Web Push Registration
 * Runs on ALL pages (index.html, dashboard.html, unauthenticated APK)
 */

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

window.autoRegisterDevicePush = async function autoRegisterDevicePush() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
  try {
    const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
    const vapidRes = await fetch('/api/notifications/vapid-key').then(r => r.json());
    if (!vapidRes || !vapidRes.publicKey) return;

    const keyArray = urlBase64ToUint8Array(vapidRes.publicKey);
    let sub = await reg.pushManager.getSubscription();

    if (!sub && typeof Notification !== 'undefined') {
      if (Notification.permission === 'default') {
        await Notification.requestPermission().catch(() => {});
      }
      if (Notification.permission === 'granted' || Notification.permission === 'default') {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: keyArray
        }).catch(err => console.log('[PWA] Subscribe catch:', err));
      }
    }

    if (sub) {
      await fetch('/api/notifications/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...sub.toJSON(), userid: 'device_' + Date.now() })
      });
      console.log('[PWA] Device Push Registered 24/7!');
    }
  } catch (e) {
    console.log('[PWA] Auto-push notice:', e);
  }
};

if ('serviceWorker' in navigator) {
  window.addEventListener('load', function() {
    navigator.serviceWorker.register('/sw.js', { scope: '/' })
      .then(function() {
        window.autoRegisterDevicePush();
      })
      .catch(function(err) {
        console.error('[PWA] ServiceWorker registration failed:', err);
      });
  });
}
