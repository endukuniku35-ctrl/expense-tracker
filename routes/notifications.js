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

// POST Subscribe device push endpoint (Public for multi-device 24/7 registration)
router.post('/subscribe', (req, res) => {
  const sub = req.body;
  const userid = req.session?.user?.userid || req.body?.userid || 'guest';
  saveSubscription(sub, userid);
  res.status(201).json({ success: true, message: 'Push subscription saved successfully!' });
});

// POST Trigger Test Status Bar Push Notification to Mobile Devices & APKs
router.post('/test-push', async (req, res) => {
  try {
    await sendPushToAllSubscribers('Curry Tracker 🍛', '📲 Test Mobile Push: Alerts working 100% across all devices & friends\' phones!');
    res.json({ success: true, message: 'Test status bar notification sent to all registered mobile devices!' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to send push notification: ' + err.message });
  }
});

// GET Notifications (Open for background Service Workers)
router.get('/', async (req, res) => {
  try {
    const notifications = await all('SELECT * FROM notifications ORDER BY timestamp DESC LIMIT 50');
    const unreadCount = (notifications || []).filter(n => !n.read).length;
    res.json({ success: true, data: notifications || [], unreadCount });
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
