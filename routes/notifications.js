/**
 * Notifications & Web Push Routes (SQLite + VAPID Engine)
 */
const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const { all, run } = require('../database');
const { vapidPublicKey, saveSubscription, sendPushToAllSubscribers } = require('../push_service');

// GET VAPID Public Key for client push registration
router.get('/vapid-key', (req, res) => {
  res.json({ success: true, publicKey: vapidPublicKey });
});

// POST Subscribe device push endpoint
router.post('/subscribe', (req, res) => {
  const sub = req.body;
  saveSubscription(sub);
  res.status(201).json({ success: true, message: 'Push subscription saved successfully!' });
});

// POST Trigger Test Status Bar Push Notification to Mobile APK
router.post('/test-push', requireAuth, async (req, res) => {
  try {
    await sendPushToAllSubscribers('Curry Tracker 🍛', '📲 Test Mobile Push Notification: System alerts are working 100% on your Android APK!');
    res.json({ success: true, message: 'Test status bar notification sent to mobile devices!' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to send push notification: ' + err.message });
  }
});

router.get('/', requireAuth, async (req, res) => {
  try {
    const notifications = await all('SELECT * FROM notifications ORDER BY timestamp DESC LIMIT 50');
    const unreadCount = notifications.filter(n => !n.read).length;
    res.json({ success: true, data: notifications, unreadCount });
  } catch (e) {
    res.json({ success: true, data: [], unreadCount: 0 });
  }
});

router.put('/:id/read', requireAuth, async (req, res) => {
  try {
    await run('UPDATE notifications SET read = 1 WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Database error' });
  }
});

router.put('/mark-all-read', requireAuth, async (req, res) => {
  try {
    await run('UPDATE notifications SET read = 1');
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Database error' });
  }
});

module.exports = router;
