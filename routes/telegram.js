/**
 * routes/telegram.js – Telegram Bot Webhook Handler
 * When a user messages @CurryTrackerBot, we auto-save their chat_id
 * so they receive future push notifications from the app.
 */

const express = require('express');
const router = express.Router();
const { saveChatId, sendTelegramMessage, getAllChatIds } = require('../telegram');

// POST /api/telegram/webhook – Receives updates from Telegram servers
router.post('/webhook', (req, res) => {
  res.status(200).json({ ok: true }); // Always respond 200 immediately to Telegram

  try {
    const update = req.body;
    const message = update && (update.message || update.edited_message);
    if (!message) return;

    const chatId = message.chat && message.chat.id;
    const text = (message.text || '').trim();
    const firstName = (message.from && message.from.first_name) || 'Friend';

    if (!chatId) return;

    // Auto-save EVERY user who messages the bot
    const isNew = saveChatId(chatId);

    if (text.startsWith('/start')) {
      // Welcome message + confirmation
      const welcomeText = isNew
        ? `✅ <b>Connected!</b> Hi ${firstName}! 🍛\n\nYou'll now receive Curry Tracker alerts here:\n• 💬 New chat messages\n• 💰 New expenses added\n• ✅ Payments settled\n• ⏰ Payment reminders\n\n<i>You're all set for 24/7 background notifications!</i>`
        : `👋 Hi ${firstName}! You're already connected to Curry Tracker alerts.\n\nYou'll receive all notifications here automatically.`;
      sendTelegramMessage(welcomeText).catch(() => {});
    } else if (text === '/stop') {
      sendTelegramMessage(`👋 ${firstName}, you can rejoin anytime by sending /start`).catch(() => {});
    } else if (text === '/status') {
      const ids = getAllChatIds();
      sendTelegramMessage(`📊 Curry Tracker Bot Status\n✅ Active\n👥 ${ids.length} device(s) connected`).catch(() => {});
    }

    console.log(`[Telegram Webhook] Message from ${firstName} (${chatId}): "${text.substring(0, 50)}" | New: ${isNew}`);
  } catch (e) {
    console.error('[Telegram Webhook] Error:', e.message);
  }
});

// GET /api/telegram/status – Check connected devices count
router.get('/status', (req, res) => {
  const ids = getAllChatIds();
  res.json({ success: true, connectedDevices: ids.length });
});

module.exports = router;
