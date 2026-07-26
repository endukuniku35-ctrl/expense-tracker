/**
 * telegram.js – Telegram Bot Notification Integration
 * Bot Token: 8610720064:AAFKbSOSwi2Xnfdz7jQDcJyduymg8VksPWE
 * Chat ID: 6877857251
 */

const https = require('https');

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '8610720064:AAFKbSOSwi2Xnfdz7jQDcJyduymg8VksPWE';
const CHAT_ID = process.env.TELEGRAM_CHAT_ID || '6877857251';

function sendTelegramMessage(text) {
  if (!BOT_TOKEN || !CHAT_ID) return Promise.resolve(false);

  const payload = JSON.stringify({
    chat_id: CHAT_ID,
    text: text,
    parse_mode: 'HTML',
    disable_web_page_preview: true
  });

  const options = {
    hostname: 'api.telegram.org',
    port: 443,
    path: `/bot${BOT_TOKEN}/sendMessage`,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(payload)
    }
  };

  return new Promise((resolve) => {
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve(json.ok === true);
        } catch (e) {
          resolve(false);
        }
      });
    });

    req.on('error', (err) => {
      console.error('Telegram notification failed:', err.message);
      resolve(false);
    });

    req.write(payload);
    req.end();
  });
}

// ─── Formatters ────────────────────────────────────

function notifyNewExpense(expense) {
  const count = expense.splitBetween ? expense.splitBetween.length : 4;
  const eachShare = Math.round(expense.amount / count);
  const msg = `
🍛 <b>NEW CURRY EXPENSE</b>

📌 <b>Meal:</b> ${expense.title} (${expense.category})
💰 <b>Total Amount:</b> ₹${expense.amount.toLocaleString('en-IN')}
👤 <b>Paid By:</b> ${expense.paidByName}
👥 <b>Split Between:</b> ${count} members (<b>₹${eachShare.toLocaleString('en-IN')}</b> each)
📅 <b>Date:</b> ${expense.date}
${expense.notes ? `📝 <b>Notes:</b> ${expense.notes}` : ''}

<i>Tracked via Curry Expense Tracker</i>
  `.trim();

  return sendTelegramMessage(msg);
}

function notifySettlement(settlement) {
  const msg = `
🤝 <b>SETTLEMENT RECORDED</b>

💸 <b>From:</b> ${settlement.fromMemberName}
📥 <b>To:</b> ${settlement.toMemberName}
💰 <b>Amount:</b> ₹${Number(settlement.amount).toLocaleString('en-IN')}
📅 <b>Date:</b> ${settlement.date}
${settlement.notes ? `📝 <b>Notes:</b> ${settlement.notes}` : ''}

<i>Curry Expense Tracker</i>
  `.trim();

  return sendTelegramMessage(msg);
}

function notifySummaryReport(stats, balances) {
  let balancesText = balances.map(b => {
    const isOwes = b.netBalance < 0;
    const sign = b.netBalance >= 0 ? '+' : '';
    const status = b.outstanding <= 0 ? '✅ Settled' : isOwes ? `🔴 Owes ₹${Math.round(b.outstanding)}` : `💰 Receives ₹${Math.round(b.outstanding)}`;
    return `• <b>${b.shortName}:</b> Paid ₹${b.totalPaid.toLocaleString('en-IN')} | Net: ${sign}₹${Math.round(b.netBalance).toLocaleString('en-IN')} (${status})`;
  }).join('\n');

  const msg = `
📊 <b>CURRY EXPENSE SUMMARY REPORT</b>

💰 <b>Total Expenses:</b> ₹${stats.totalExpenses.toLocaleString('en-IN')}
👥 <b>Members:</b> ${stats.memberCount}
📆 <b>This Month:</b> ₹${stats.monthExpense.toLocaleString('en-IN')}
📅 <b>Today:</b> ₹${stats.todayExpense.toLocaleString('en-IN')}

<b>Member Balances:</b>
${balancesText}

<i>Curry Expense Tracker</i>
  `.trim();

  return sendTelegramMessage(msg);
}

module.exports = {
  sendTelegramMessage,
  notifyNewExpense,
  notifySettlement,
  notifySummaryReport
};
