/**
 * rotation.js – Daily Payer Rotation & Turn Tracker Route
 * Automatically tracks whose turn it is to pay today (Person 1 -> 2 -> 3 -> 4 -> Repeats)
 * Includes custom user sequence customization & skip turn capabilities.
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
      customSequence TEXT,
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

// Helper: Get members in configured custom rotation sequence
async function getOrderedRotationMembers() {
  const allMembers = await all('SELECT userid, name, shortName, avatar, role FROM users ORDER BY userid ASC');
  const state = await get('SELECT currentIndex, customSequence FROM rotation_state WHERE id = "default"') || { currentIndex: 0 };

  let customSeq = [];
  try {
    if (state.customSequence) {
      customSeq = typeof state.customSequence === 'string' ? JSON.parse(state.customSequence) : state.customSequence;
    }
  } catch (e) {}

  if (Array.isArray(customSeq) && customSeq.length > 0) {
    const memberMap = {};
    allMembers.forEach(m => { memberMap[m.userid] = m; });
    const ordered = [];
    customSeq.forEach(uid => {
      if (memberMap[uid]) ordered.push(memberMap[uid]);
    });
    // Add any remaining members not in custom sequence
    allMembers.forEach(m => {
      if (!ordered.find(x => x.userid === m.userid)) ordered.push(m);
    });
    return { members: ordered, state, allMembers };
  }

  return { members: allMembers, state, allMembers };
}

// GET /api/rotation - Get current turn, member sequence, and recent rotation logs
router.get('/', requireAuth, async (req, res) => {
  try {
    const { members, state, allMembers } = await getOrderedRotationMembers();
    const logs = await all('SELECT * FROM rotation_logs ORDER BY createdAt DESC LIMIT 30');

    const totalMembers = members.length || 1;
    const currentIndex = (state.currentIndex || 0) % totalMembers;

    const currentPayer = members[currentIndex] || members[0];
    const nextIndex = (currentIndex + 1) % totalMembers;
    const nextPayer = members[nextIndex] || members[0];

    // Compute stats per member
    const statsMap = {};
    allMembers.forEach(m => { statsMap[m.userid] = { turnsCount: 0, totalAmount: 0 }; });

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
      allMembers,
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
    const { amount, item } = req.body;
    const parsedAmount = parseFloat(amount);

    if (!parsedAmount || parsedAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Please enter a valid amount spent today' });
    }

    const { members, state } = await getOrderedRotationMembers();
    if (!members.length) return res.status(400).json({ success: false, message: 'No members found' });

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
      `INSERT INTO expenses (id, title, description, amount, paidBy, paidByName, splitBetween, category, date, notes, status, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        expenseId,
        `[Rotation Turn] ${itemDescription}`,
        itemDescription,
        parsedAmount,
        currentPayer.userid,
        currentPayer.name,
        JSON.stringify(members.map(m => m.userid)),
        'Food/Curry',
        todayStr,
        `Daily Payer Rotation Turn #${currentIndex + 1}`,
        'active',
        createdAt,
        createdAt
      ]
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
    res.status(500).json({ success: false, message: 'Failed to advance rotation turn: ' + err.message });
  }
});

// POST /api/rotation/skip-turn - Skip current person's turn
router.post('/skip-turn', requireAdmin, async (req, res) => {
  try {
    const { members, state } = await getOrderedRotationMembers();
    if (!members.length) return res.status(400).json({ success: false, message: 'No members found' });

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

// POST /api/rotation/update-sequence - Customize user rotation sequence & member order
router.post('/update-sequence', requireAdmin, async (req, res) => {
  try {
    const { customSequence, resetIndex } = req.body;
    if (!Array.isArray(customSequence) || customSequence.length === 0) {
      return res.status(400).json({ success: false, message: 'Please select at least 1 member for rotation' });
    }

    const seqJson = JSON.stringify(customSequence);
    const createdAt = new Date().toISOString();

    const state = await get('SELECT * FROM rotation_state WHERE id = "default"');
    let newIdx = state ? state.currentIndex : 0;
    if (resetIndex) newIdx = 0;

    await run('UPDATE rotation_state SET customSequence = ?, currentIndex = ?, updatedAt = ? WHERE id = "default"', [seqJson, newIdx, createdAt]);

    res.json({
      success: true,
      message: `Rotation sequence updated with ${customSequence.length} member(s)!`
    });
  } catch (err) {
    console.error('Error updating rotation sequence:', err);
    res.status(500).json({ success: false, message: 'Failed to update rotation sequence' });
  }
});

module.exports = router;
