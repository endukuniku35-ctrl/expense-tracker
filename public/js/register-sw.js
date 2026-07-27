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

if ('serviceWorker' in navigator) {
  window.addEventListener('load', function() {
    navigator.serviceWorker.register('/sw.js', { scope: '/' })
      .then(function(reg) {
        console.log('[PWA] ServiceWorker registered with scope:', reg.scope);
        
        // Auto-subscribe fresh VAPID Push on opening app / APK without requiring login
        if ('PushManager' in window && reg.pushManager) {
          fetch('/api/notifications/vapid-key')
            .then(res => res.json())
            .then(async data => {
              if (data && data.publicKey) {
                const keyArray = urlBase64ToUint8Array(data.publicKey);
                let existingSub = await reg.pushManager.getSubscription();
                if (existingSub) {
                  await existingSub.unsubscribe().catch(() => {});
                }
                const newSub = await reg.pushManager.subscribe({
                  userVisibleOnly: true,
                  applicationServerKey: keyArray
                });
                return fetch('/api/notifications/subscribe', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ ...newSub.toJSON(), userid: 'unauthenticated_apk' })
                });
              }
            })
            .then(() => console.log('[PWA] Fresh VAPID Push Subscribed 24/7'))
            .catch(err => console.log('[PWA] VAPID Sub notice:', err));
        }
      })
      .catch(function(err) {
        console.error('[PWA] ServiceWorker registration failed:', err);
      });
  });
}
