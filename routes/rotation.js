/**
 * rotation.js – Daily Payer Rotation & Turn Tracker Route
 * Automatically tracks whose turn it is to pay today (Person 1 -> 2 -> 3 -> 4 -> Repeats)
 */

const express = require('express');
const router = express.Router();
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { run, all, get } = require('../database');
const { sendPushToAllSubscribers } = require('../push_service');
const { sendTelegramMessage } = require('../telegram');

// Ensure database table for rotation exists
async function initRotationTable() {
  await run(`
    CREATE TABLE IF NOT EXISTS rotation_logs (
      id TEXT PRIMARY KEY,
      payerId TEXT NOT NULL,
      payerName TEXT NOT NULL,
      amount REAL NOT NULL,
      item TEXT,
      date TEXT NOT NULL,
      turnIndex INTEGER NOT NULL,
      createdAt TEXT NOT NULL
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS rotation_state (
      id TEXT PRIMARY KEY,
      currentIndex INTEGER DEFAULT 0,
      updatedAt TEXT
    )
  `);

  // Initialize state if empty
  const state = await get('SELECT * FROM rotation_state WHERE id = "default"');
  if (!state) {
    await run('INSERT INTO rotation_state (id, currentIndex, updatedAt) VALUES ("default", 0, ?)', [new Date().toISOString()]);
  }
}
initRotationTable().catch(err => console.error('[Rotation DB Error]:', err));

// GET /api/rotation - Get current turn, member sequence, and recent rotation logs
router.get('/', requireAuth, async (req, res) => {
  try {
    const members = await all('SELECT userid, name, shortName, avatar, role FROM users ORDER BY userid ASC');
    const state = await get('SELECT currentIndex FROM rotation_state WHERE id = "default"') || { currentIndex: 0 };
    const logs = await all('SELECT * FROM rotation_logs ORDER BY createdAt DESC LIMIT 30');

    const totalMembers = members.length || 1;
    const currentIndex = (state.currentIndex || 0) % totalMembers;

    const currentPayer = members[currentIndex] || members[0];
    const nextIndex = (currentIndex + 1) % totalMembers;
    const nextPayer = members[nextIndex] || members[0];

    // Compute stats per member (turns completed, total spent in rotation)
    const statsMap = {};
    members.forEach(m => { statsMap[m.userid] = { turnsCount: 0, totalAmount: 0 }; });

    (logs || []).forEach(log => {
      if (statsMap[log.payerId]) {
        statsMap[log.payerId].turnsCount += 1;
        statsMap[log.payerId].totalAmount += (log.amount || 0);
      }
    });

    const sequence = members.map((m, idx) => ({
      ...m,
      isCurrentTurn: idx === currentIndex,
      isNextTurn: idx === nextIndex,
      turnOrder: idx + 1,
      stats: statsMap[m.userid] || { turnsCount: 0, totalAmount: 0 }
    }));

    res.json({
      success: true,
      currentIndex,
      currentPayer,
      nextPayer,
      totalMembers,
      sequence,
      logs: logs || []
    });
  } catch (err) {
    console.error('Error fetching rotation state:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch rotation state' });
  }
});

// POST /api/rotation/complete-turn - Mark current turn as complete, record expense, and advance to next person
router.post('/complete-turn', requireAuth, async (req, res) => {
  try {
    const { amount, item, note } = req.body;
    const parsedAmount = parseFloat(amount);

    if (!parsedAmount || parsedAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Please enter a valid amount spent today' });
    }

    const members = await all('SELECT userid, name, shortName FROM users ORDER BY userid ASC');
    if (!members.length) return res.status(400).json({ success: false, message: 'No members found' });

    const state = await get('SELECT currentIndex FROM rotation_state WHERE id = "default"') || { currentIndex: 0 };
    const currentIndex = (state.currentIndex || 0) % members.length;
    const currentPayer = members[currentIndex];

    // Record rotation log
    const logId = 'rot_' + Date.now();
    const todayStr = new Date().toISOString().split('T')[0];
    const createdAt = new Date().toISOString();
    const itemDescription = item || 'Daily Expense (Rotation)';

    await run(
      `INSERT INTO rotation_logs (id, payerId, payerName, amount, item, date, turnIndex, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [logId, currentPayer.userid, currentPayer.name, parsedAmount, itemDescription, todayStr, currentIndex, createdAt]
    );

    // Also auto-add to main expenses table so balance stays in sync!
    const expenseId = 'exp_rot_' + Date.now();
    await run(
      `INSERT INTO expenses (id, paidById, paidByName, amount, description, category, date, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [expenseId, currentPayer.userid, currentPayer.name, parsedAmount, `[Rotation Turn] ${itemDescription}`, 'Food/Curry', todayStr, createdAt]
    );

    // Advance turn index to next person
    const newIndex = (currentIndex + 1) % members.length;
    const newNextPayer = members[newIndex];

    await run('UPDATE rotation_state SET currentIndex = ?, updatedAt = ? WHERE id = "default"', [newIndex, createdAt]);

    // Send Telegram & Push Notification
    const alertMsg = `🔄 <b>Daily Payer Rotation Updated!</b>\n\n👤 <b>Paid Today:</b> ${currentPayer.name} (₹${parsedAmount.toLocaleString('en-IN')})\n📋 <b>Item:</b> ${itemDescription}\n👉 <b>Next Turn Tomorrow:</b> <b>${newNextPayer.name}</b>\n\n<i>Jagan Money Expense Tracker</i>`;
    sendTelegramMessage(alertMsg).catch(() => {});
    sendPushToAllSubscribers('Daily Rotation Turn Complete 🔄', `${currentPayer.name} paid ₹${parsedAmount}. Tomorrow's turn: ${newNextPayer.name}!`).catch(() => {});

    res.json({
      success: true,
      message: `Turn complete! ${currentPayer.name} paid ₹${parsedAmount}. Next turn: ${newNextPayer.name}`,
      nextPayer: newNextPayer,
      newIndex
    });
  } catch (err) {
    console.error('Error completing rotation turn:', err);
    res.status(500).json({ success: false, message: 'Failed to advance rotation turn' });
  }
});

// POST /api/rotation/skip-turn - Skip current person's turn (e.g. if absent)
router.post('/skip-turn', requireAdmin, async (req, res) => {
  try {
    const members = await all('SELECT userid, name FROM users ORDER BY userid ASC');
    if (!members.length) return res.status(400).json({ success: false, message: 'No members found' });

    const state = await get('SELECT currentIndex FROM rotation_state WHERE id = "default"') || { currentIndex: 0 };
    const currentIndex = (state.currentIndex || 0) % members.length;
    const skippedMember = members[currentIndex];

    const newIndex = (currentIndex + 1) % members.length;
    const nextMember = members[newIndex];

    await run('UPDATE rotation_state SET currentIndex = ?, updatedAt = ? WHERE id = "default"', [newIndex, new Date().toISOString()]);

    res.json({
      success: true,
      message: `Skipped ${skippedMember.name}'s turn. Now it's ${nextMember.name}'s turn!`,
      nextPayer: nextMember
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to skip turn' });
  }
});

module.exports = router;
