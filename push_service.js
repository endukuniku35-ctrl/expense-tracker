/**
 * push_service.js – Multi-Device VAPID Web Push Notification Engine
 * Keeps ALL device subscriptions persistent and sends push notifications concurrently.
 */

const webPush = require('web-push');
const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, 'data');
const subFile = path.join(dataDir, 'push_subscriptions.json');

// Valid Cryptographic VAPID Keys for Google FCM Android Notification Delivery
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

function getSubscriptions() {
  if (!fs.existsSync(subFile)) return [];
  try {
    return JSON.parse(fs.readFileSync(subFile, 'utf8'));
  } catch (e) {
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
  fs.writeFileSync(subFile, JSON.stringify(subs, null, 2));
  console.log(`[PushService] Persistent SAVED device subscription for [${userid}]. Total active devices: ${subs.length}`);
}

async function sendPushToAllSubscribers(title, message, targetUserid = 'all', url = '/dashboard.html#chat') {
  const subs = getSubscriptions();
  if (subs.length === 0) {
    console.log('[PushService] No subscriptions registered to push to.');
    return;
  }

  const payload = JSON.stringify({
    title: title || 'Curry Tracker 🍛',
    body: message,
    url: url || '/dashboard.html#chat'
  });

  const pushOptions = {
    TTL: 86400,
    urgency: 'high',
    headers: {
      'Urgency': 'high'
    }
  };

  // Broadcast to all registered device endpoints concurrently without deleting active subscriptions
  const sendPromises = subs.map(async (sub) => {
    try {
      await webPush.sendNotification(sub, payload, pushOptions);
      console.log(`[VAPID Push] Delivered to ${sub.userid}`);
    } catch (err) {
      console.log(`[VAPID Push] Notice for ${sub.userid}:`, err.statusCode || err.message);
    }
  });

  await Promise.allSettled(sendPromises);
}

module.exports = {
  vapidPublicKey: vapidKeys.publicKey,
  saveSubscription,
  sendPushToAllSubscribers
};
