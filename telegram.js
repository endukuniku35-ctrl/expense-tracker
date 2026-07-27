/**
 * telegram.js – Telegram Bot Notifications + Webhook + Auto-Recovery
 * Bot: @CurryTrackerBot  Token: 8610720064:AAFKbSOSwi2Xnfdz7jQDcJyduymg8VksPWE
 *
 * KEY FIX: On every server startup, calls getUpdates to recover ALL past chatters'
 * chat IDs automatically — even after Render.com wipes the filesystem on deploy.
 * This means: friend taps START once → forever registered, even across deploys.
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '8610720064:AAFKbSOSwi2Xnfdz7jQDcJyduymg8VksPWE';
const ADMIN_CHAT_ID = process.env.TELEGRAM_CHAT_ID || '6877857251';
const chatsFile = path.join(__dirname, 'data', 'telegram_chats.json');

const agent = new https.Agent({ keepAlive: true, timeout: 15000 });

// In-memory set of all registered chat IDs (survives between requests, restored on startup)
const _chatIdSet = new Set([ADMIN_CHAT_ID]);

// ── Chat ID Registry ──────────────────────────────────────────────────────────

function getAllChatIds() {
  // Load from file into memory if not already loaded
  try {
    if (fs.existsSync(chatsFile)) {
      const stored = JSON.parse(fs.readFileSync(chatsFile, 'utf8'));
      if (Array.isArray(stored)) stored.forEach(id => _chatIdSet.add(String(id)));
    }
  } catch (e) {}
  return [..._chatIdSet];
}

function saveChatId(chatId) {
  if (!chatId) return false;
  const id = String(chatId);
  const isNew = !_chatIdSet.has(id);
  _chatIdSet.add(id);
  // Write to file for persistence within same deploy cycle
  try {
    const dataDir = path.dirname(chatsFile);
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
    fs.writeFileSync(chatsFile, JSON.stringify([..._chatIdSet], null, 2));
    if (isNew) console.log(`[Telegram] ✅ New chat ID registered: ${id}. Total: ${_chatIdSet.size}`);
  } catch (e) {
    console.error('[Telegram] Failed to save chat ID:', e.message);
  }
  return isNew;
}

// ── getUpdates Recovery (runs on startup) ────────────────────────────────────
// Pulls ALL previous messages from Telegram API and extracts every chat ID.
// This is the key fix: even if data files are wiped, we restore from Telegram's history.

function syncAllChatIdsFromHistory() {
  return new Promise((resolve) => {
    const options = {
      hostname: 'api.telegram.org',
      port: 443,
      path: `/bot${BOT_TOKEN}/getUpdates?limit=100&allowed_updates=["message"]`,
      method: 'GET',
      agent
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try {
          const r = JSON.parse(data);
          if (r.ok && Array.isArray(r.result)) {
            let newCount = 0;
            r.result.forEach(update => {
              const msg = update.message || update.edited_message || update.callback_query?.message;
              if (msg && msg.chat && msg.chat.id) {
                const id = String(msg.chat.id);
                if (!_chatIdSet.has(id)) newCount++;
                _chatIdSet.add(id);
              }
            });
            // Persist to file
            try {
              const dataDir = path.dirname(chatsFile);
              if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
              fs.writeFileSync(chatsFile, JSON.stringify([..._chatIdSet], null, 2));
            } catch (e) {}
            console.log(`[Telegram] 🔄 Restored from history: ${_chatIdSet.size} total chat IDs (${newCount} newly recovered)`);
          }
        } catch (e) {
          console.error('[Telegram] getUpdates parse error:', e.message);
        }
        resolve();
      });
    });
    req.on('error', (e) => { console.error('[Telegram] getUpdates error:', e.message); resolve(); });
    req.setTimeout(12000, () => { req.destroy(); resolve(); });
    req.end();
  });
}

// ── Core Send Function ────────────────────────────────────────────────────────

function _sendToChat(chatId, text) {
  const payload = JSON.stringify({
    chat_id: chatId,
    text: text,
    parse_mode: 'HTML',
    disable_web_page_preview: true
  });
  const options = {
    hostname: 'api.telegram.org',
    port: 443,
    path: `/bot${BOT_TOKEN}/sendMessage`,
    method: 'POST',
    agent,
    headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) }
  };
  return new Promise((resolve) => {
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try {
          const r = JSON.parse(data);
          if (!r.ok) console.log(`[Telegram] ⚠️ Send to ${chatId} failed: ${r.description}`);
          resolve(r.ok === true);
        } catch (e) { resolve(false); }
      });
    });
    req.on('error', (e) => { console.error('[Telegram] Send error:', e.message); resolve(false); });
    req.setTimeout(10000, () => { req.destroy(); resolve(false); });
    req.write(payload);
    req.end();
  });
}

// ── Broadcast to ALL registered users ────────────────────────────────────────

function sendTelegramMessage(text) {
  const ids = getAllChatIds();
  console.log(`[Telegram] Broadcasting to ${ids.length} chat(s)`);
  return Promise.allSettled(ids.map(id => _sendToChat(id, text)));
}

// ── Register Webhook with Render URL ─────────────────────────────────────────

function registerWebhook(baseUrl) {
  if (!baseUrl) return;
  const webhookUrl = `${baseUrl}/api/telegram/webhook`;
  const payload = JSON.stringify({ url: webhookUrl, allowed_updates: ['message'] });
  const options = {
    hostname: 'api.telegram.org',
    port: 443,
    path: `/bot${BOT_TOKEN}/setWebhook`,
    method: 'POST',
    agent,
    headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) }
  };
  const req = https.request(options, (res) => {
    let data = '';
    res.on('data', c => data += c);
    res.on('end', () => {
      try {
        const r = JSON.parse(data);
        console.log(`[Telegram] Webhook → ${webhookUrl}: ${r.ok ? '✅ OK' : '❌ ' + r.description}`);
      } catch (e) {}
    });
  });
  req.on('error', () => {});
  req.write(payload);
  req.end();
}

// ── Message Formatters ────────────────────────────────────────────────────────

function notifyNewExpense(expense) {
  const msg = `🍛 <b>New Expense Added</b>

💰 <b>Amount:</b> ₹${expense.amount}
📋 <b>Item:</b> ${expense.description}
👤 <b>Paid By:</b> ${expense.paidByName}
📅 <b>Date:</b> ${new Date(expense.date || Date.now()).toLocaleDateString('en-IN')}

<i>Curry Expense Tracker</i>`;
  return sendTelegramMessage(msg);
}

function notifySettlement(settlement) {
  const msg = `✅ <b>Payment Settled!</b>

💸 <b>Amount:</b> ₹${settlement.amount}
👤 <b>Paid By:</b> ${settlement.paidByName}
🎯 <b>To:</b> ${settlement.toName || 'Group'}

<i>Curry Expense Tracker</i>`;
  return sendTelegramMessage(msg);
}

function notifySummaryReport(stats) {
  const balancesText = (stats.balances || []).map(b =>
    `  ${b.name}: ${b.balance >= 0 ? '+' : ''}₹${Math.abs(b.balance).toLocaleString('en-IN')}`
  ).join('\n');

  const msg = `📊 <b>CURRY EXPENSE SUMMARY REPORT</b>

💰 <b>Total Expenses:</b> ₹${stats.totalExpenses.toLocaleString('en-IN')}
👥 <b>Members:</b> ${stats.memberCount}
📆 <b>This Month:</b> ₹${stats.monthExpense.toLocaleString('en-IN')}
📅 <b>Today:</b> ₹${stats.todayExpense.toLocaleString('en-IN')}

<b>Member Balances:</b>
${balancesText}

<i>Curry Expense Tracker</i>`.trim();

  return sendTelegramMessage(msg);
}

module.exports = {
  sendTelegramMessage,
  saveChatId,
  getAllChatIds,
  registerWebhook,
  syncAllChatIdsFromHistory,
  notifyNewExpense,
  notifySettlement,
  notifySummaryReport
};
