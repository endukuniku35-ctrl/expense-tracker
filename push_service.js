/**
 * push_service.js – VAPID Web Push Notification Engine
 * Stores subscriptions in data/push_subscriptions.json via the same database engine.
 */

const webPush = require('web-push');
const fs = require('fs');
const path = require('path');

const vapidKeys = {
  publicKey: process.env.VAPID_PUBLIC_KEY || 'BNeVWZeLEOso9tKFoFONBaagdoHjMsjEX5GmxTztQ9WeFXchVvoYJb3qjc7peRYWn_kw7bF12eZ3SsCT3IrDpJ8',
  privateKey: process.env.VAPID_PRIVATE_KEY || 'E0s5ISnE1wkp46aFjzYPIDv2uLPX8meiEEfPnKrS8BE'
};

try {
  webPush.setVapidDetails(
    'mailto:jagan@currytracker.app',
    vapidKeys.publicKey,
    vapidKeys.privateKey
  );
} catch (e) {
  console.error('[VAPID] Key setup error:', e);
}

// Use same data directory as database.js for persistence across deploys
const dataDir = path.join(__dirname, 'data');
const subFile = path.join(dataDir, 'push_subscriptions.json');

// In-memory cache of subscriptions (survives restarts via file, survives deploys if persistent disk)
let _subsCache = null;

function getSubscriptions() {
  if (_subsCache) return _subsCache;
  if (!fs.existsSync(subFile)) {
    _subsCache = [];
    return [];
  }
  try {
    _subsCache = JSON.parse(fs.readFileSync(subFile, 'utf8'));
    return _subsCache;
  } catch (e) {
    _subsCache = [];
    return [];
  }
}

function saveSubscription(sub, userid = 'guest') {
  if (!sub) return;
  const endpoint = sub.endpoint || (sub.subscription && sub.subscription.endpoint);
  if (!endpoint) return;

  const keys = sub.keys || (sub.subscription && sub.subscription.keys) || {};

  let subs = getSubscriptions();
  const idx = subs.findIndex(s => s.endpoint === endpoint);
  const entry = {
    endpoint,
    keys,
    userid: userid || sub.userid || 'guest',
    updatedAt: new Date().toISOString()
  };

  if (idx !== -1) {
    subs[idx] = entry;
  } else {
    subs.push(entry);
  }

  _subsCache = subs;

  try {
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
    fs.writeFileSync(subFile, JSON.stringify(subs, null, 2));
    console.log(`[PushService] Saved device subscription for [${userid}]. Total devices: ${subs.length}`);
  } catch (e) {
    console.error('[PushService] Failed to write subscriptions file:', e.message);
  }
}

async function sendPushToAllSubscribers(title, message) {
  const subs = getSubscriptions();
  console.log(`[PushService] Sending push to ${subs.length} device(s): "${message}"`);

  if (subs.length === 0) {
    console.log('[PushService] No device subscriptions registered. Users must open the app and allow notifications.');
    return;
  }

  const payload = JSON.stringify({
    title: title || 'Curry Tracker 🍛',
    body: message,
    url: '/dashboard.html#chat'
  });

  const pushOptions = {
    TTL: 86400,
    urgency: 'high',
    headers: { 'Urgency': 'high' }
  };

  const results = await Promise.allSettled(
    subs.map(async (sub) => {
      try {
        await webPush.sendNotification(sub, payload, pushOptions);
        console.log(`[VAPID Push] ✅ Delivered to ${sub.userid}`);
      } catch (err) {
        console.log(`[VAPID Push] ⚠️ Error for ${sub.userid}: ${err.statusCode || err.message}`);
      }
    })
  );

  return results;
}

module.exports = {
  vapidPublicKey: vapidKeys.publicKey,
  saveSubscription,
  sendPushToAllSubscribers
};
