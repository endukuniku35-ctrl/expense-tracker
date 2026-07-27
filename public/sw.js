/**
 * sw.js – Curry Expense Tracker Service Worker
 * Enables PWA offline access, 24/7 background push notifications without logging in, sound, vibration, and Play Store TWA compliance.
 */

const CACHE_NAME = 'curry-tracker-v420-SILENT-FALSE';
const HOST_URL = self.location.origin;

const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/dashboard.html',
  '/css/style.css',
  '/js/app.js',
  '/js/dashboard.js',
  '/js/members.js',
  '/js/expenses.js',
  '/js/payments.js',
  '/js/reports.js',
  '/js/charts.js',
  '/js/profile.js',
  '/js/notifications.js',
  '/js/search.js',
  '/js/ai_assistant.js',
  '/js/ocr_scanner.js',
  '/js/budget.js',
  '/js/audit.js',
  '/js/inventory.js',
  '/js/attendance.js',
  '/js/groups.js',
  '/js/community.js',
  '/js/calendar.js',
  '/js/rapid_expense.js',
  '/manifest.json'
];

let swSeenNotifIds = new Set();
let isFirstSwPoll = true;

// 24/7 Service Worker Poller for Mobile Status Bar Notifications
setInterval(async () => {
  try {
    const res = await fetch(HOST_URL + '/api/notifications/public');
    if (res && res.status === 200) {
      const json = await res.json();
      if (json && json.success && Array.isArray(json.data)) {
        if (isFirstSwPoll) {
          json.data.forEach(n => swSeenNotifIds.add(n.id));
          isFirstSwPoll = false;
        } else {
          json.data.forEach(n => {
            if (!swSeenNotifIds.has(n.id)) {
              swSeenNotifIds.add(n.id);
              displayAndroidNotification('Curry Tracker 🍛', n.message);
            }
          });
        }
      }
    }
  } catch (e) {}
}, 2000);

function displayAndroidNotification(title, body) {
  const options = {
    body: body || 'New alert from CurryTracker',
    icon: HOST_URL + '/icons/icon-192.png',
    vibrate: [500, 200, 500, 200, 500],
    data: { url: HOST_URL + '/dashboard.html#chat' },
    tag: 'curry-push-' + Date.now(),
    renotify: true,
    requireInteraction: true,
    silent: false
  };
  return self.registration.showNotification(title || 'Curry Tracker 🍛', options);
}

// Install Event
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS_TO_CACHE)).then(() => self.skipWaiting())
  );
});

// Activate Event
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) return caches.delete(cache);
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Event
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.pathname.startsWith('/api/')) return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response && response.status === 200 && response.type === 'basic') {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone));
        }
        return response;
      })
      .catch(() => caches.match(event.request).then((cached) => cached || caches.match('/index.html')))
  );
});

// Client Message Event
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SHOW_NOTIFICATION') {
    displayAndroidNotification(event.data.title, event.data.body);
  }
});

// Background Push Event Handler
self.addEventListener('push', (event) => {
  let title = 'Curry Tracker 🍛';
  let body = 'New message or expense update!';

  if (event.data) {
    try {
      const data = event.data.json();
      title = data.title || title;
      body = data.body || body;
    } catch (e) {
      body = event.data.text();
    }
  }

  event.waitUntil(displayAndroidNotification(title, body));
});

// Periodic Sync Event Handler for Android Background Service Execution
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'curry-notif-sync') {
    event.waitUntil(
      fetch(HOST_URL + '/api/notifications/public')
        .then(res => res.json())
        .then(json => {
          if (json && json.success && Array.isArray(json.data)) {
            json.data.forEach(n => {
              if (!swSeenNotifIds.has(n.id)) {
                swSeenNotifIds.add(n.id);
                displayAndroidNotification('Curry Tracker 🍛', n.message);
              }
            });
          }
        })
        .catch(() => {})
    );
  }
});

// Notification Click Event
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (let client of clientList) {
        if (client.url && 'focus' in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow(HOST_URL + '/dashboard.html#chat');
    })
  );
});
