/**
 * routes/balance.js (SQLite & JSON Backend)
 * Core logic: curry expenses split among participating members (2, 3, or 4 people).
 * One person pays the full bill → participating members split the cost equally.
 */

const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { all, get, run } = require('../database');

const MEMBERS = [
  { userid: '192472374', name: 'Jagan',   shortName: 'Jagan',   avatar: 'JK' },
  { userid: '192472343', name: 'Sagar',   shortName: 'Sagar',   avatar: 'SN' },
  { userid: '192411184', name: 'Prathap', shortName: 'Prathap', avatar: 'PK' },
  { userid: '192411185', name: 'Bharath', shortName: 'Bharath', avatar: 'BR' },
];

const ALL_MEMBER_IDS = MEMBERS.map(m => m.userid);

function parseSplitBetween(val) {
  if (Array.isArray(val) && val.length > 0) return val;
  if (typeof val === 'string' && val.trim()) {
    try {
      const p = JSON.parse(val);
      if (Array.isArray(p) && p.length > 0) return p;
    } catch (e) {}
  }
  return ALL_MEMBER_IDS;
}

/**
 * Compute the full balance sheet from expenses + settlements
 */
async function computeBalances() {
  try {
    const expRows = await all('SELECT * FROM expenses ORDER BY date DESC, createdAt DESC');
    const setRows = await all('SELECT * FROM settlements ORDER BY date DESC, createdAt DESC');

    const expenses = (expRows || []).map(r => ({
      ...r,
      amount: Number(r.amount || 0),
      splitBetween: parseSplitBetween(r.splitBetween)
    }));

    const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);

    // Per-member stats
    const balances = {};
    MEMBERS.forEach(m => {
      balances[m.userid] = {
        ...m,
        totalPaid:     0,   // total bill amount paid as payer
        totalShare:    0,   // total fair share across meals participated in
        netBalance:    0,   // totalPaid - totalShare (+ve = others owe them)
        settledIn:     0,   // cash received from others (settlements)
        settledOut:    0,   // cash paid to others (settlements)
        outstanding:   0,   // what still needs to be settled
        expenseCount:  0,   // meals paid as bill payer
        mealsCount:    0,   // meals participated in
        expenses:      [],
        status:        'pending',
      };
    });

    // Tally who paid what & calculate dynamic per-meal split
    expenses.forEach(e => {
      const splitList = parseSplitBetween(e.splitBetween);
      const perPersonForMeal = e.amount / splitList.length;

      if (balances[e.paidBy]) {
        balances[e.paidBy].totalPaid    += e.amount;
        balances[e.paidBy].expenseCount += 1;
        balances[e.paidBy].expenses.push({
          ...e,
          splitCount: splitList.length,
          perPersonShare: perPersonForMeal
        });
      }

      splitList.forEach(uid => {
        if (balances[uid]) {
          balances[uid].totalShare += perPersonForMeal;
          balances[uid].mealsCount += 1;
        }
      });
    });

    // Settlements
    (setRows || []).forEach(s => {
      const amt = Number(s.amount || 0);
      if (balances[s.fromMemberId]) balances[s.fromMemberId].settledOut += amt;
      if (balances[s.toMemberId])   balances[s.toMemberId].settledIn   += amt;
    });

    // Final balances computation
    const totalShareSum = Object.values(balances).reduce((s, b) => s + b.totalShare, 0);
    const perPersonShare = totalShareSum / 4;

    MEMBERS.forEach(m => {
      const b = balances[m.userid];
      b.netBalance  = b.totalPaid - b.totalShare;
      if (b.netBalance >= 0) {
        b.outstanding = Math.max(0, b.netBalance - b.settledIn);
        b.status = b.outstanding <= 0 ? 'settled' : 'to-receive';
      } else {
        b.outstanding = Math.max(0, Math.abs(b.netBalance) - b.settledOut);
        b.status = b.outstanding <= 0 ? 'settled' : 'owes';
      }
      b.percentage = b.totalShare > 0
        ? Math.min(100, Math.round((b.totalPaid / b.totalShare) * 100))
        : 0;
    });

    return { balances: Object.values(balances), totalExpenses, perPersonShare, settlements: setRows || [] };
  } catch (err) {
    console.error('❌ CRITICAL ERROR IN computeBalances:', err);
    throw err;
  }
}

// GET /api/balance  – full balance sheet
router.get('/', requireAuth, async (req, res) => {
  try {
    const data = await computeBalances();
    res.json({ success: true, ...data });
  } catch (err) {
    console.error('Error in /api/balance:', err);
    res.status(500).json({ success: false, message: 'Failed to compute balance' });
  }
});

// GET /api/balance/summary – quick summary
router.get('/summary', requireAuth, async (req, res) => {
  try {
    const { balances, totalExpenses, perPersonShare } = await computeBalances();
    res.json({ success: true, balances, totalExpenses, perPersonShare });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch balance summary' });
  }
});

// GET /api/balance/settlements – all settlements
router.get('/settlements', requireAuth, async (req, res) => {
  try {
    const settlements = await all('SELECT * FROM settlements ORDER BY date DESC, createdAt DESC');
    res.json({ success: true, data: settlements || [] });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch settlements' });
  }
});

const { notifySettlement } = require('../telegram');

// POST /api/balance/settle – admin records a cash settlement
router.post('/settle', requireAdmin, async (req, res) => {
  const { fromMemberId, fromMemberName, toMemberId, toMemberName, amount, notes, date } = req.body;

  if (!fromMemberId || !toMemberId || !amount || parseFloat(amount) <= 0) {
    return res.status(400).json({ success: false, message: 'from, to, and amount are required' });
  }
  if (fromMemberId === toMemberId) {
    return res.status(400).json({ success: false, message: 'From and To member cannot be the same' });
  }

  const id = uuidv4();
  const createdAt = new Date().toISOString();
  const settlementDate = date || new Date().toISOString().split('T')[0];
  const parsedAmount = parseFloat(amount);

  try {
    const settlementData = { id, fromMemberId, fromMemberName, toMemberId, toMemberName, amount: parsedAmount, notes: notes || '', date: settlementDate, createdAt };

    await run(
      `INSERT INTO settlements (id, fromMemberId, fromMemberName, toMemberId, toMemberName, amount, notes, date, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, fromMemberId, fromMemberName, toMemberId, toMemberName, parsedAmount, notes || '', settlementDate, createdAt]
    );

    // Notification
    await run(
      `INSERT INTO notifications (id, type, message, timestamp, read, forRole) VALUES (?, ?, ?, ?, 0, ?)`,
      [uuidv4(), 'payment', `Settlement: ${fromMemberName} paid ₹${parsedAmount} to ${toMemberName}`, createdAt, 'admin']
    );

    // Telegram Bot Notification
    notifySettlement(settlementData).catch(err => console.error('Telegram error:', err));

    res.status(201).json({ success: true, message: 'Settlement recorded in DB', data: settlementData });
  } catch (err) {
    console.error('Error saving settlement:', err);
    res.status(500).json({ success: false, message: 'Database error saving settlement' });
  }
});

// DELETE /api/balance/settle/:id – remove a settlement (admin)
router.delete('/settle/:id', requireAdmin, async (req, res) => {
  const { id } = req.params;
  try {
    const existing = await get('SELECT * FROM settlements WHERE id = ?', [id]);
    if (!existing) return res.status(404).json({ success: false, message: 'Settlement not found' });

    await run('DELETE FROM settlements WHERE id = ?', [id]);
    res.json({ success: true, message: 'Settlement deleted from DB' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Database error deleting settlement' });
  }
});

module.exports = { router, computeBalances, MEMBERS };
