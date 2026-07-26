/**
 * routes/messages.js – Roommate Group Chat & Payment Reminders
 */
const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const { all, run } = require('../database');

// GET all group messages
router.get('/', requireAuth, async (req, res) => {
  try {
    const messages = await all('SELECT * FROM messages ORDER BY timestamp ASC');
    res.json({ success: true, data: messages });
  } catch (e) {
    res.json({ success: true, data: [] });
  }
});

// POST send new chat message
router.post('/', requireAuth, async (req, res) => {
  try {
    const { message } = req.body;
    if (!message || !message.trim()) {
      return res.status(400).json({ success: false, message: 'Message text is required' });
    }

    const msgObj = {
      id: 'msg_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      senderId: req.user.userid,
      senderName: req.user.name || req.user.shortName,
      senderAvatar: req.user.avatar || '👤',
      senderRole: req.user.role || 'member',
      text: message.trim(),
      timestamp: new Date().toISOString()
    };

    await run(
      'INSERT INTO messages (id, senderId, senderName, senderAvatar, senderRole, text, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [msgObj.id, msgObj.senderId, msgObj.senderName, msgObj.senderAvatar, msgObj.senderRole, msgObj.text, msgObj.timestamp]
    );

    // Also add to notifications for all members
    const notifMsg = `💬 ${msgObj.senderName}: "${msgObj.text.length > 30 ? msgObj.text.substring(0, 30) + '...' : msgObj.text}"`;
    await run(
      'INSERT INTO notifications (id, type, message, timestamp, read, forRole) VALUES (?, ?, ?, ?, 0, ?)',
      ['notif_' + Date.now(), 'message', notifMsg, msgObj.timestamp, 'all']
    );

    res.json({ success: true, data: msgObj });
  } catch (e) {
    console.error('Error sending message:', e);
    res.status(500).json({ success: false, message: 'Failed to send message' });
  }
});

// POST send payment reminder nudge
router.post('/nudge', requireAuth, async (req, res) => {
  try {
    const { targetMemberId, targetMemberName, amount } = req.body;
    const senderName = req.user.name || req.user.shortName;

    const nudgeText = `🔔 Payment Reminder: Hey ${targetMemberName}, please settle your pending balance of ₹${parseFloat(amount).toLocaleString('en-IN')} via PhonePe/UPI when possible!`;

    const msgObj = {
      id: 'msg_nudge_' + Date.now(),
      senderId: req.user.userid,
      senderName: senderName,
      senderAvatar: '⚡',
      senderRole: req.user.role || 'member',
      text: nudgeText,
      timestamp: new Date().toISOString(),
      isNudge: true
    };

    await run(
      'INSERT INTO messages (id, senderId, senderName, senderAvatar, senderRole, text, timestamp, isNudge) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [msgObj.id, msgObj.senderId, msgObj.senderName, msgObj.senderAvatar, msgObj.senderRole, msgObj.text, msgObj.timestamp, 1]
    );

    // Add high-priority notification
    await run(
      'INSERT INTO notifications (id, type, message, timestamp, read, forRole) VALUES (?, ?, ?, ?, 0, ?)',
      ['notif_' + Date.now(), 'payment', `📲 Reminder from ${senderName} to ${targetMemberName} for ₹${amount}`, msgObj.timestamp, 'all']
    );

    res.json({ success: true, message: `Payment reminder sent to ${targetMemberName}!` });
  } catch (e) {
    console.error('Error sending nudge:', e);
    res.status(500).json({ success: false, message: 'Failed to send payment reminder' });
  }
});

module.exports = router;
