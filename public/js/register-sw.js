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

    if (!sub) {
      if (typeof Notification !== 'undefined' && Notification.permission !== 'granted') {
        if (Notification.permission === 'default') {
          const perm = await Notification.requestPermission().catch(() => 'denied');
          if (perm !== 'granted') {
            console.log('[PWA] Push permission not granted during auto-register:', perm);
            return;
          }
        } else {
          console.log('[PWA] Push permission blocked. Cannot auto-subscribe.');
          return;
        }
      }

      try {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: keyArray
        });
      } catch (err) {
        console.error('[PWA] Auto push subscribe failed:', err);
        return;
      }
    }

    if (sub) {
      const res = await fetch('/api/notifications/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...sub.toJSON(), userid: 'device_' + Date.now() })
      });
      const data = await res.json().catch(() => null);
      if (data && data.success) {
        console.log('[PWA] Device Push Registered Successfully 24/7!');
      } else {
        console.error('[PWA] Auto-register subscription save failed:', data);
      }
    }
  } catch (e) {
    console.log('[PWA] Auto-push notice:', e);
  }
};

if ('serviceWorker' in navigator) {
  window.addEventListener('load', async function() {
    if (navigator.serviceWorker.getRegistrations) {
      navigator.serviceWorker.getRegistrations().then(registrations => {
        for (let reg of registrations) {
          reg.update().catch(() => {});
        }
      }).catch(() => {});
    }

    try {
      await navigator.serviceWorker.register('/sw.js', { scope: '/' });
      await navigator.serviceWorker.ready;
      await window.autoRegisterDevicePush();
    } catch (err) {
      console.error('[PWA] ServiceWorker registration failed:', err);
    }
  });
}
