/**
 * push_service.js – Multi-Device VAPID Web Push Notification Engine
 * Sends push notifications concurrently via Promise.allSettled to all devices.
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
  if (!endpoint) {
    console.error('[PushService] Rejected subscription - missing endpoint:', sub);
    return;
  }
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
  console.log(`[PushService] SAVED device subscription for user [${userid}]. Total active devices: ${subs.length}`);
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

  const remainingSubs = [];

  // Broadcast to all registered device endpoints in parallel
  const sendPromises = subs.map(async (sub) => {
    try {
      await webPush.sendNotification(sub, payload, pushOptions);
      console.log(`[VAPID Push] Push delivered to ${sub.userid} (${sub.endpoint.substring(0, 30)}...)`);
      remainingSubs.push(sub);
    } catch (err) {
      console.log(`[VAPID Push] Error sending to ${sub.userid}:`, err.statusCode || err.message);
      if (err.statusCode !== 410 && err.statusCode !== 404) {
        remainingSubs.push(sub);
      }
    }
  });

  await Promise.allSettled(sendPromises);

  if (remainingSubs.length !== subs.length) {
    fs.writeFileSync(subFile, JSON.stringify(remainingSubs, null, 2));
  }
}

module.exports = {
  vapidPublicKey: vapidKeys.publicKey,
  saveSubscription,
  sendPushToAllSubscribers
};
