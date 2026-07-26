/**
 * Notifications Routes
 */
const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const notificationsFile = path.join(__dirname, '../data/notifications.json');

router.get('/', requireAuth, (req, res) => {
  try {
    const notifications = JSON.parse(fs.readFileSync(notificationsFile, 'utf8'));
    res.json({ success: true, data: notifications, unreadCount: notifications.filter(n => !n.read).length });
  } catch (e) {
    res.json({ success: true, data: [], unreadCount: 0 });
  }
});

router.put('/:id/read', requireAuth, (req, res) => {
  const notifications = JSON.parse(fs.readFileSync(notificationsFile, 'utf8'));
  const idx = notifications.findIndex(n => n.id === req.params.id);
  if (idx !== -1) {
    notifications[idx].read = true;
    fs.writeFileSync(notificationsFile, JSON.stringify(notifications, null, 2));
  }
  res.json({ success: true });
});

router.put('/mark-all-read', requireAuth, (req, res) => {
  const notifications = JSON.parse(fs.readFileSync(notificationsFile, 'utf8'));
  notifications.forEach(n => n.read = true);
  fs.writeFileSync(notificationsFile, JSON.stringify(notifications, null, 2));
  res.json({ success: true });
});

module.exports = router;
