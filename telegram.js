/**
 * telegram.js – Telegram Bot Notifications + Webhook Handler
 * Bot: @CurryTrackerBot  Token: 8610720064:AAFKbSOSwi2Xnfdz7jQDcJyduymg8VksPWE
 *
 * Two delivery methods:
 *  1) Hardcoded Admin Chat ID (6877857251) — always receives every alert
 *  2) Per-user Chat IDs linked via /start command in the Telegram bot
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '8610720064:AAFKbSOSwi2Xnfdz7jQDcJyduymg8VksPWE';
const ADMIN_CHAT_ID = process.env.TELEGRAM_CHAT_ID || '6877857251';
const chatsFile = path.join(__dirname, 'data', 'telegram_chats.json');

const agent = new https.Agent({ keepAlive: true, timeout: 12000 });

// ── Chat ID Registry ──────────────────────────────────────────────────────────

function getAllChatIds() {
  const ids = new Set([ADMIN_CHAT_ID]);
  try {
    if (fs.existsSync(chatsFile)) {
      const stored = JSON.parse(fs.readFileSync(chatsFile, 'utf8'));
      if (Array.isArray(stored)) stored.forEach(id => ids.add(String(id)));
    }
  } catch (e) {}
  return [...ids];
}

function saveChatId(chatId) {
  if (!chatId) return false;
  const id = String(chatId);
  const ids = getAllChatIds();
  if (ids.includes(id)) return false; // already registered
  ids.push(id);
  try {
    if (!fs.existsSync(path.dirname(chatsFile))) fs.mkdirSync(path.dirname(chatsFile), { recursive: true });
    fs.writeFileSync(chatsFile, JSON.stringify(ids, null, 2));
    console.log(`[Telegram] ✅ New chat ID registered: ${id}. Total: ${ids.length}`);
    return true;
  } catch (e) {
    console.error('[Telegram] Failed to save chat ID:', e.message);
    return false;
  }
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
          if (!r.ok) console.log(`[Telegram] Send to ${chatId} failed: ${r.description}`);
          resolve(r.ok === true);
        } catch (e) { resolve(false); }
      });
    });
    req.on('error', (e) => { console.error('[Telegram] Error:', e.message); resolve(false); });
    req.setTimeout(10000, () => { req.destroy(); resolve(false); });
    req.write(payload);
    req.end();
  });
}

// ── Broadcast to ALL registered users ────────────────────────────────────────

function sendTelegramMessage(text) {
  const ids = getAllChatIds();
  console.log(`[Telegram] Broadcasting to ${ids.length} chat(s): ${text.substring(0, 60)}`);
  return Promise.allSettled(ids.map(id => _sendToChat(id, text)));
}

// ── Register Telegram Webhook with Render URL ─────────────────────────────────

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
        console.log(`[Telegram] Webhook registered → ${webhookUrl}: ${r.ok ? '✅ Success' : '❌ ' + r.description}`);
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
  notifyNewExpense,
  notifySettlement,
  notifySummaryReport
};
