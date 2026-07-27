/**
 * routes/messages.js – Roommate Group Chat & Payment Reminders
 */
const express = require('express');
const router = express.Router();
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { all, run } = require('../database');
const { sendPushToAllSubscribers } = require('../push_service');
const { sendTelegramMessage } = require('../telegram');

// GET all group messages (Available for ALL users without login requirement)
router.get('/', async (req, res) => {
  try {
    const messages = await all('SELECT * FROM messages ORDER BY timestamp ASC');
    res.json({ success: true, data: messages || [] });
  } catch (e) {
    res.json({ success: true, data: [] });
  }
});

// POST send new chat message (Available for ALL users without login requirement)
router.post('/', async (req, res) => {
  try {
    const user = req.session?.user || req.user || {};
    const { message, senderName } = req.body;
    if (!message || !message.trim()) {
      return res.status(400).json({ success: false, message: 'Message text is required' });
    }

    const msgObj = {
      id: 'msg_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      senderId: user.userid || 'member',
      senderName: (req.body.senderName && req.body.senderName.trim()) || user.name || user.shortName || 'Roommate',
      senderAvatar: user.avatar || '👤',
      senderRole: user.role || 'member',
      text: message.trim(),
      timestamp: new Date().toISOString()
    };

    await run(
      'INSERT INTO messages (id, senderId, senderName, senderAvatar, senderRole, text, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [msgObj.id, msgObj.senderId, msgObj.senderName, msgObj.senderAvatar, msgObj.senderRole, msgObj.text, msgObj.timestamp]
    );

    // Also add to notifications for all members
    const notifMsg = `💬 ${msgObj.senderName}: "${msgObj.text.length > 40 ? msgObj.text.substring(0, 40) + '...' : msgObj.text}"`;
    await run(
      'INSERT INTO notifications (id, type, message, timestamp, read, forRole) VALUES (?, ?, ?, ?, 0, ?)',
      ['notif_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6), 'message', notifMsg, msgObj.timestamp, 'all']
    );

    // Respond immediately to the frontend client
    res.json({ success: true, data: msgObj });

    // Execute multi-device status bar push and Telegram alerts asynchronously in background
    setImmediate(() => {
      sendPushToAllSubscribers(`💬 ${msgObj.senderName}`, msgObj.text).catch(() => {});
      sendTelegramMessage(`💬 <b>${msgObj.senderName}:</b> ${msgObj.text}`).catch(() => {});
    });
  } catch (e) {
    console.error('Error sending message:', e);
    res.status(500).json({ success: false, message: 'Failed to send message: ' + e.message });
  }
});

// POST send payment reminder nudge (Admin Only)
router.post('/nudge', requireAdmin, async (req, res) => {
  try {
    const user = req.session?.user || req.user || {};
    const { targetMemberId, targetMemberName, amount } = req.body;
    const senderName = user.name || user.shortName || 'Jagan Kandukuri';

    const nudgeText = `🔔 Payment Reminder: Hey ${targetMemberName}, please settle your pending balance of ₹${parseFloat(amount).toLocaleString('en-IN')} via PhonePe/UPI when possible!`;

    const msgObj = {
      id: 'msg_nudge_' + Date.now(),
      senderId: user.userid || '192472374',
      senderName: senderName,
      senderAvatar: '⚡',
      senderRole: user.role || 'admin',
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

    sendPushToAllSubscribers('📲 Payment Reminder', nudgeText).catch(() => {});
    sendTelegramMessage(`🔔 <b>PAYMENT REMINDER:</b> ${nudgeText}`).catch(() => {});

    res.json({ success: true, message: `Payment reminder sent to ${targetMemberName}!` });
  } catch (e) {
    console.error('Error sending nudge:', e);
    res.status(500).json({ success: false, message: 'Failed to send payment reminder: ' + e.message });
  }
});

// POST Admin Broadcast message to all members (Admin Only)
router.post('/broadcast', requireAdmin, async (req, res) => {
  try {
    const user = req.session?.user || req.user || {};
    const { type, subject, text } = req.body;
    if (!text || !text.trim()) {
      return res.status(400).json({ success: false, message: 'Broadcast text is required' });
    }

    const iconMap = {
      urgent: '🚨',
      curry: '🍛',
      announcement: '📢'
    };
    const icon = iconMap[type] || '📢';
    const broadcastSubject = subject ? `[${subject}] ` : '';
    const fullMessage = `${icon} OFFICIAL ANNOUNCEMENT ${broadcastSubject}: ${text.trim()}`;

    const msgObj = {
      id: 'msg_bcast_' + Date.now(),
      senderId: user.userid || '192472374',
      senderName: 'ADMIN ' + (user.name || user.shortName || 'Jagan'),
      senderAvatar: '👑',
      senderRole: 'admin',
      text: fullMessage,
      timestamp: new Date().toISOString(),
      isNudge: true,
      isBroadcast: true
    };

    await run(
      'INSERT INTO messages (id, senderId, senderName, senderAvatar, senderRole, text, timestamp, isNudge) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [msgObj.id, msgObj.senderId, msgObj.senderName, msgObj.senderAvatar, msgObj.senderRole, msgObj.text, msgObj.timestamp, 1]
    );

    // Add high-priority notification to notifications.json for all members
    await run(
      'INSERT INTO notifications (id, type, message, timestamp, read, forRole) VALUES (?, ?, ?, ?, 0, ?)',
      ['notif_bcast_' + Date.now(), 'broadcast', fullMessage, msgObj.timestamp, 'all']
    );

    sendPushToAllSubscribers('📢 Admin Broadcast', fullMessage).catch(() => {});
    sendTelegramMessage(`📢 <b>ANNOUNCEMENT:</b> ${fullMessage}`).catch(() => {});

    res.json({ success: true, message: 'Broadcast announcement sent to all members successfully!', data: msgObj });
  } catch (e) {
    console.error('Error sending broadcast:', e);
    res.status(500).json({ success: false, message: 'Failed to send broadcast: ' + e.message });
  }
});

module.exports = router;
