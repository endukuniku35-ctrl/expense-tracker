/**
 * sw.js – Curry Expense Tracker Service Worker
 * Enables PWA offline access, background push notifications, sound, vibration, and Play Store TWA compliance.
 */

const CACHE_NAME = 'curry-tracker-v55';
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
let swPollInterval = null;

// Service Worker Independent Background Notification Poller (Runs in isolated Android process)
function startSWBackgroundPolling() {
  if (swPollInterval) return;
  swPollInterval = setInterval(async () => {
    try {
      const res = await fetch('/api/notifications');
      if (res && res.status === 200) {
        const json = await res.json();
        if (json && json.success && Array.isArray(json.data)) {
          const unread = json.data.filter(n => !n.read);
          for (const n of unread) {
            if (!swSeenNotifIds.has(n.id)) {
              swSeenNotifIds.add(n.id);
              self.registration.showNotification('Curry Tracker 🍛', {
                body: n.message,
                icon: '/icons/icon-192.png',
                badge: '/icons/icon-192.png',
                vibrate: [500, 200, 500, 200, 500],
                tag: 'curry-apk-' + n.id,
                renotify: true,
                requireInteraction: true,
                data: { url: '/dashboard.html#chat' }
              });
            }
          }
        }
      }
    } catch (e) {}
  }, 4000);
}

// Install Event
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Pre-caching static assets');
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => self.skipWaiting())
  );
});

// Activate Event
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('[Service Worker] Purging old cache:', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => {
      startSWBackgroundPolling();
      return self.clients.claim();
    })
  );
});

// Fetch Event (Network first for API calls, Cache first for static assets)
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Skip non-GET or API requests (always live from server)
  if (event.request.method !== 'GET' || url.pathname.startsWith('/api/')) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response && response.status === 200 && response.type === 'basic') {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) return cachedResponse;
          if (event.request.mode === 'navigate') {
            return caches.match('/index.html');
          }
        });
      })
  );
});

// Message Event Handler for Direct Client-to-SW Notification Requests
self.addEventListener('message', (event) => {
  startSWBackgroundPolling();

  if (event.data && event.data.type === 'SHOW_NOTIFICATION') {
    const { title, body } = event.data;
    const options = {
      body: body || 'New alert from CurryTracker',
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      vibrate: [500, 200, 500, 200, 500],
      data: { url: '/dashboard.html#chat' },
      requireInteraction: true,
      tag: 'curry-msg-' + Date.now(),
      renotify: true
    };
    self.registration.showNotification(title || 'Curry Tracker 🍛', options);
  }
});

// Background Push Event Handler for Mobile Devices (Status bar alert with sound & vibration)
self.addEventListener('push', (event) => {
  let data = { title: 'Curry Tracker 🍛', body: 'New roommate message or expense update!' };
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    vibrate: [500, 200, 500, 200, 500],
    data: { url: '/dashboard.html#chat' },
    requireInteraction: true,
    tag: 'curry-msg-' + Date.now(),
    renotify: true
  };

  event.waitUntil(self.registration.showNotification(data.title, options));
});

// Notification Click Event
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (let client of clientList) {
        if (client.url && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow('/dashboard.html#chat');
      }
    })
  );
});
