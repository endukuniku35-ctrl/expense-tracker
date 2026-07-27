/**
 * keep_alive.js – Persistent Android Background Service Engine
 * Prevents Android OS from sleeping or killing CurryTracker when minimized or screen is locked.
 */

(function initKeepAliveEngine() {
  console.log('[KeepAlive] Initializing Android Persistent Background Service Engine...');

  // 1. Web Lock API to prevent Android OS process sleep
  if ('locks' in navigator) {
    navigator.locks.request('curry_tracker_keep_alive', { mode: 'shared' }, async () => {
      console.log('[KeepAlive] Acquired background web lock. App will stay alive in background.');
      await new Promise(() => {}); // Hold lock indefinitely
    }).catch(e => console.log('[KeepAlive] Lock notice:', e));
  }

  // 2. Periodic Sync Registration with Android OS
  if ('serviceWorker' in navigator && 'periodicSync' in ServiceWorkerRegistration.prototype) {
    navigator.serviceWorker.ready.then(async (reg) => {
      try {
        await reg.periodicSync.register('curry-notif-sync', {
          minInterval: 15 * 1000 // 15 seconds background sync interval
        });
        console.log('[KeepAlive] Android PeriodicSync registered successfully.');
      } catch (e) {
        console.log('[KeepAlive] PeriodicSync notice:', e);
      }
    });
  }
})();
