/**
 * register-sw.js – Automatic Service Worker & VAPID Push Re-Registration
 * KEY FIX: On every page load, we re-POST the existing push subscription to the server.
 * This is needed because Render.com free tier wipes the server's push_subscriptions.json on every deploy.
 * The browser's Service Worker keeps the subscription locally - we just need to re-send it to server.
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
    const vapidRes = await fetch('/api/notifications/vapid-key').then(r => r.json()).catch(() => null);
    if (!vapidRes || !vapidRes.publicKey) return;

    const keyArray = urlBase64ToUint8Array(vapidRes.publicKey);

    // Step 1: Try to get existing subscription from browser (no permission prompt needed)
    let sub = await reg.pushManager.getSubscription();

    // Step 2: If no existing subscription, request permission and create one
    if (!sub) {
      if (typeof Notification !== 'undefined') {
        let perm = Notification.permission;
        if (perm === 'default') {
          perm = await Notification.requestPermission().catch(() => 'denied');
        }
        if (perm === 'granted') {
          sub = await reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: keyArray
          }).catch(err => {
            console.log('[PWA] Push subscribe notice:', err.message);
            return null;
          });
        }
      }
    }

    // Step 3: ALWAYS re-POST the subscription to the server on every page load
    // This is critical: Render.com free tier wipes files on deploy, so we must re-register every time
    if (sub) {
      const subJson = sub.toJSON();
      await fetch('/api/notifications/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...subJson, userid: 'user_' + (Date.now() % 100000) })
      }).catch(() => {});
      console.log('[PWA] ✅ Device push subscription re-synced to server!');
    } else {
      console.log('[PWA] No push subscription available (permission may be denied).');
    }
  } catch (e) {
    console.log('[PWA] Auto-push notice:', e.message);
  }
};

if ('serviceWorker' in navigator) {
  window.addEventListener('load', async function() {
    try {
      await navigator.serviceWorker.register('/sw.js', { scope: '/' });
      // Run immediately on load - no waiting
      window.autoRegisterDevicePush();
    } catch (err) {
      console.error('[PWA] ServiceWorker registration failed:', err);
    }
  });
}
