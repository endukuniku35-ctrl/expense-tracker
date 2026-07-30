/**
 * sw.js – Curry Expense Tracker Service Worker
 * Polls /api/notifications/public every 2s and shows status bar banners directly via self.registration.showNotification()
 */

const CACHE_NAME = 'curry-tracker-v550';
const HOST_URL = self.location.origin;

const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/dashboard.html',
  '/manifest.json'
];

let swSeenNotifIds = new Set();
let isFirstSwPoll = true;

// ── 24/7 Background Poller ───────────────────────────────────────────────────
// Polls every 2 seconds and shows Android status bar notifications for new items
setInterval(async () => {
  try {
    const res = await fetch(HOST_URL + '/api/notifications/public', { cache: 'no-store' });
    if (!res || res.status !== 200) return;
    const json = await res.json();
    if (!json || !json.success || !Array.isArray(json.data)) return;

    if (isFirstSwPoll) {
      // On first poll, mark all existing notifications as seen so we don't spam old ones
      json.data.forEach(n => swSeenNotifIds.add(n.id));
      isFirstSwPoll = false;
    } else {
      // On subsequent polls, show notification for any new IDs
      for (const n of json.data) {
        if (!swSeenNotifIds.has(n.id)) {
          swSeenNotifIds.add(n.id);
          showStatusBarNotification('Jagan Money 💰', n.message || 'New update from roommates!');
        }
      }
    }
  } catch (e) {
    // Network error - silently ignore
  }
}, 2000);

// ── Show Status Bar Notification ─────────────────────────────────────────────
function showStatusBarNotification(title, body) {
  return self.registration.showNotification(title, {
    body: body,
    icon: HOST_URL + '/icons/icon-192.png',
    vibrate: [300, 100, 300, 100, 300],
    tag: 'curry-' + Date.now(),
    renotify: true,
    data: { url: HOST_URL + '/dashboard.html#chat' }
  });
}

// ── VAPID Push Event ─────────────────────────────────────────────────────────
self.addEventListener('push', (event) => {
  let title = 'Jagan Money 💰';
  let body = 'New update from your roommates!';
  try {
    const data = event.data ? event.data.json() : {};
    title = data.title || title;
    body = data.body || body;
  } catch (e) {}
  event.waitUntil(showStatusBarNotification(title, body));
});

// ── Notification Click ────────────────────────────────────────────────────────
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      const url = (event.notification.data && event.notification.data.url) || (HOST_URL + '/dashboard.html#chat');
      for (const c of clientList) {
        if (c.url.includes(HOST_URL) && 'focus' in c) return c.focus();
      }
      return clients.openWindow(url);
    })
  );
});

// ── Install ──────────────────────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS_TO_CACHE)).catch(() => {}).then(() => self.skipWaiting())
  );
});

// ── Activate ─────────────────────────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// ── Fetch ─────────────────────────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  if (event.request.url.includes('/api/')) return;
  event.respondWith(
    caches.match(event.request).then(cached => cached || fetch(event.request).catch(() => cached))
  );
});

// ── Message from page ─────────────────────────────────────────────────────────
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SHOW_NOTIFICATION') {
    showStatusBarNotification(event.data.title || 'Jagan Money 💰', event.data.body || 'New alert!');
  }
});
