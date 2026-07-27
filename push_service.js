/**
 * push_service.js – VAPID Web Push Notification Engine for Android APK / TWA Apps
 * Delivers background status bar notifications directly to Android devices at any time.
 */

const webPush = require('web-push');
const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, 'data');
const subFile = path.join(dataDir, 'push_subscriptions.json');

// Fixed VAPID Keys for consistent cross-session subscriptions
const vapidKeys = {
  publicKey: process.env.VAPID_PUBLIC_KEY || 'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-Skv6bDAyqZKB8R_Yn_34-sL-3Zg',
  privateKey: process.env.VAPID_PRIVATE_KEY || '3Zg8R_Yn_34-sL-3ZgBEl62iUYgUivxIkv69yViEuiBIa'
};

try {
  webPush.setVapidDetails(
    'mailto:jagan@curry.local',
    vapidKeys.publicKey,
    vapidKeys.privateKey
  );
} catch (e) {
  // If fallback fails, auto-generate fresh VAPID keys
  const keys = webPush.generateVAPIDKeys();
  vapidKeys.publicKey = keys.publicKey;
  vapidKeys.privateKey = keys.privateKey;
  webPush.setVapidDetails('mailto:jagan@curry.local', keys.publicKey, keys.privateKey);
}

function getSubscriptions() {
  if (!fs.existsSync(subFile)) return [];
  try {
    return JSON.parse(fs.readFileSync(subFile, 'utf8'));
  } catch (e) {
    return [];
  }
}

function saveSubscription(sub) {
  if (!sub || !sub.endpoint) return;
  let subs = getSubscriptions();
  const exists = subs.find(s => s.endpoint === sub.endpoint);
  if (!exists) {
    subs.push(sub);
    fs.writeFileSync(subFile, JSON.stringify(subs, null, 2));
  }
}

async function sendPushToAllSubscribers(title, message, url = '/dashboard.html#chat') {
  const subs = getSubscriptions();
  if (subs.length === 0) return;

  const payload = JSON.stringify({
    title: title || 'Curry Tracker 🍛',
    body: message,
    url: url || '/dashboard.html#chat'
  });

  const remainingSubs = [];

  for (const sub of subs) {
    try {
      await webPush.sendNotification(sub, payload);
      remainingSubs.push(sub);
    } catch (err) {
      if (err.statusCode !== 410 && err.statusCode !== 404) {
        remainingSubs.push(sub);
      }
    }
  }

  if (remainingSubs.length !== subs.length) {
    fs.writeFileSync(subFile, JSON.stringify(remainingSubs, null, 2));
  }
}

module.exports = {
  vapidPublicKey: vapidKeys.publicKey,
  saveSubscription,
  sendPushToAllSubscribers
};
