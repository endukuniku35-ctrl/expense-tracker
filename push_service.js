/**
 * push_service.js – VAPID Web Push Engine
 *
 * PERSISTENCE STRATEGY:
 * Subscriptions are saved to data/push_subscriptions.json.
 * Additionally, when a NEW subscription is added, it auto-pushes the file
 * to GitHub via the GitHub API so it survives future Render deploys.
 *
 * GitHub repo: endukuniku35-ctrl/expense-tracker
 * Branch: main
 * Token: Stored in GITHUB_TOKEN env var (set on Render dashboard)
 */

const webPush = require('web-push');
const https = require('https');
const fs = require('fs');
const path = require('path');

const vapidKeys = {
  publicKey: process.env.VAPID_PUBLIC_KEY || 'BNeVWZeLEOso9tKFoFONBaagdoHjMsjEX5GmxTztQ9WeFXchVvoYJb3qjc7peRYWn_kw7bF12eZ3SsCT3IrDpJ8',
  privateKey: process.env.VAPID_PRIVATE_KEY || 'E0s5ISnE1wkp46aFjzYPIDv2uLPX8meiEEfPnKrS8BE'
};

try {
  webPush.setVapidDetails('mailto:jagan@currytracker.app', vapidKeys.publicKey, vapidKeys.privateKey);
} catch (e) {
  console.error('[VAPID] Key setup error:', e);
}

const dataDir = path.join(__dirname, 'data');
const subFile = path.join(dataDir, 'push_subscriptions.json');
let _subsCache = null;

// ── File I/O ─────────────────────────────────────────────────────────────────

function readSubscriptions() {
  if (_subsCache) return _subsCache;
  try {
    if (fs.existsSync(subFile)) {
      _subsCache = JSON.parse(fs.readFileSync(subFile, 'utf8'));
      return _subsCache;
    }
  } catch (e) {}
  _subsCache = [];
  return [];
}

function writeSubscriptions(subs) {
  _subsCache = subs;
  try {
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
    fs.writeFileSync(subFile, JSON.stringify(subs, null, 2));
  } catch (e) {
    console.error('[PushService] Failed to write subscriptions:', e.message);
  }
}

// ── GitHub Auto-Commit (persists subscriptions across Render deploys) ─────────

function commitSubscriptionsToGitHub(subs) {
  const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
  if (!GITHUB_TOKEN) return; // Skip if no token configured

  const REPO = 'endukuniku35-ctrl/expense-tracker';
  const FILE_PATH = 'data/push_subscriptions.json';
  const BRANCH = 'main';
  const content = Buffer.from(JSON.stringify(subs, null, 2) + '\n').toString('base64');

  // First, get the current file SHA (needed by GitHub API to update)
  const getOptions = {
    hostname: 'api.github.com',
    path: `/repos/${REPO}/contents/${FILE_PATH}?ref=${BRANCH}`,
    method: 'GET',
    headers: {
      'Authorization': `token ${GITHUB_TOKEN}`,
      'User-Agent': 'CurryTracker-PushService',
      'Accept': 'application/vnd.github.v3+json'
    }
  };

  const getReq = https.request(getOptions, (res) => {
    let data = '';
    res.on('data', c => data += c);
    res.on('end', () => {
      try {
        const { sha } = JSON.parse(data);
        // Now update the file with new subscriptions
        const body = JSON.stringify({
          message: `[auto] Update push subscriptions (${subs.length} devices)`,
          content,
          sha,
          branch: BRANCH
        });
        const putOptions = {
          hostname: 'api.github.com',
          path: `/repos/${REPO}/contents/${FILE_PATH}`,
          method: 'PUT',
          headers: {
            'Authorization': `token ${GITHUB_TOKEN}`,
            'User-Agent': 'CurryTracker-PushService',
            'Accept': 'application/vnd.github.v3+json',
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(body)
          }
        };
        const putReq = https.request(putOptions, (r) => {
          r.resume();
          console.log(`[PushService] ✅ GitHub commit: ${subs.length} subscriptions saved permanently`);
        });
        putReq.on('error', () => {});
        putReq.write(body);
        putReq.end();
      } catch (e) {}
    });
  });
  getReq.on('error', () => {});
  getReq.end();
}

// ── Save Subscription ─────────────────────────────────────────────────────────

function saveSubscription(sub, userid = 'guest') {
  if (!sub) return;
  const endpoint = sub.endpoint || (sub.subscription && sub.subscription.endpoint);
  if (!endpoint) return;

  const keys = sub.keys || (sub.subscription && sub.subscription.keys) || {};
  let subs = readSubscriptions();

  const idx = subs.findIndex(s => s.endpoint === endpoint);
  const entry = { endpoint, keys, userid: userid || sub.userid || 'guest', updatedAt: new Date().toISOString() };
  const isNew = idx === -1;

  if (!isNew) {
    subs[idx] = entry;
  } else {
    subs.push(entry);
  }

  writeSubscriptions(subs);
  console.log(`[PushService] ${isNew ? '✅ NEW' : '♻️ Updated'} subscription for [${userid}]. Total devices: ${subs.length}`);

  // Auto-commit to GitHub so it survives the next deploy
  if (isNew) {
    setImmediate(() => commitSubscriptionsToGitHub(subs));
  }
}

// ── Send Push to All Devices ──────────────────────────────────────────────────

async function sendPushToAllSubscribers(title, message) {
  const subs = readSubscriptions();
  console.log(`[PushService] Sending push to ${subs.length} device(s): "${message}"`);

  if (subs.length === 0) {
    console.log('[PushService] No subscriptions. User must open app and allow notifications.');
    return;
  }

  const payload = JSON.stringify({
    title: title || 'Jagan Money 💰',
    body: message,
    url: '/dashboard.html#chat'
  });

  const dead = [];
  await Promise.allSettled(
    subs.map(async (sub) => {
      try {
        await webPush.sendNotification(sub, payload, { TTL: 86400, urgency: 'high' });
        console.log(`[VAPID] ✅ Delivered to ${sub.userid}`);
      } catch (err) {
        console.log(`[VAPID] ⚠️ ${sub.userid}: ${err.statusCode || err.message}`);
        if (err.statusCode === 410 || err.statusCode === 404) {
          dead.push(sub.endpoint); // Remove expired subscriptions
        }
      }
    })
  );

  // Clean up dead subscriptions
  if (dead.length > 0) {
    const cleaned = subs.filter(s => !dead.includes(s.endpoint));
    writeSubscriptions(cleaned);
    console.log(`[PushService] Removed ${dead.length} expired subscription(s)`);
  }
}

module.exports = { vapidPublicKey: vapidKeys.publicKey, saveSubscription, sendPushToAllSubscribers };
