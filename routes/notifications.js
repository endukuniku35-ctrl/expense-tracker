/**
 * Notifications Routes (SQLite Backend)
 */
const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const { all, run } = require('../database');

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
