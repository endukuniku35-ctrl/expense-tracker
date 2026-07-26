/**
 * routes/balance.js
 * Core logic: curry expenses split among participating members (2, 3, or 4 people).
 * One person pays the full bill → participating members split the cost equally.
 *
 * Balance Model:
 *   For each expense of ₹X paid by member P split between N members:
 *     - P's net contribution  = +X (they paid)
 *     - Each participating member's share = X / N
 *     - Non-participating members' share = 0
 *
 *   Running Balance per member:
 *     totalPaid     = sum of all expenses they paid as bill payer
 *     totalShare    = sum of their fair shares for meals they participated in
 *     netBalance    = totalPaid - totalShare (+ve = others owe them, -ve = they owe)
 *     settledAmount = sum of cash settlements they've made/received
 *     outstanding   = remaining balance to settle
 */

const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const expensesFile    = path.join(__dirname, '../data/expenses.json');
const settlementsFile = path.join(__dirname, '../data/settlements.json');
const usersFile       = path.join(__dirname, '../data/users.json');
const notifFile       = path.join(__dirname, '../data/notifications.json');

const MEMBERS = [
  { userid: '192472374', name: 'Jagan',   shortName: 'Jagan',   avatar: 'JK' },
  { userid: '192472343', name: 'Sagar',   shortName: 'Sagar',   avatar: 'SN' },
  { userid: '192411184', name: 'Prathap', shortName: 'Prathap', avatar: 'PK' },
  { userid: '192411185', name: 'Bharath', shortName: 'Bharath', avatar: 'BR' },
];

function readJSON(file) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return []; }
}

function writeJSON(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

/**
 * Compute the full balance sheet from expenses + settlements
 */
function computeBalances() {
  const expenses    = readJSON(expensesFile);
  const settlements = readJSON(settlementsFile);

  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);
  const allUserIds = MEMBERS.map(m => m.userid);

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
    const splitList = (Array.isArray(e.splitBetween) && e.splitBetween.length > 0)
      ? e.splitBetween
      : allUserIds;

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
  settlements.forEach(s => {
    if (balances[s.fromMemberId]) balances[s.fromMemberId].settledOut += s.amount;
    if (balances[s.toMemberId])   balances[s.toMemberId].settledIn   += s.amount;
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

  return { balances: Object.values(balances), totalExpenses, perPersonShare, settlements };
}

// GET /api/balance  – full balance sheet
router.get('/', requireAuth, (req, res) => {
  const data = computeBalances();
  res.json({ success: true, ...data });
});

// GET /api/balance/summary – quick summary
router.get('/summary', requireAuth, (req, res) => {
  const { balances, totalExpenses, perPersonShare } = computeBalances();
  res.json({ success: true, balances, totalExpenses, perPersonShare });
});

// GET /api/balance/settlements – all settlements
router.get('/settlements', requireAuth, (req, res) => {
  const settlements = readJSON(settlementsFile);
  settlements.sort((a, b) => new Date(b.date) - new Date(a.date));
  res.json({ success: true, data: settlements });
});

// POST /api/balance/settle – admin records a cash settlement
router.post('/settle', requireAdmin, (req, res) => {
  const { fromMemberId, fromMemberName, toMemberId, toMemberName, amount, notes, date } = req.body;

  if (!fromMemberId || !toMemberId || !amount || parseFloat(amount) <= 0) {
    return res.status(400).json({ success: false, message: 'from, to, and amount are required' });
  }
  if (fromMemberId === toMemberId) {
    return res.status(400).json({ success: false, message: 'From and To member cannot be the same' });
  }

  const settlement = {
    id: uuidv4(),
    fromMemberId,
    fromMemberName,
    toMemberId,
    toMemberName,
    amount: parseFloat(amount),
    notes: notes || '',
    date: date || new Date().toISOString().split('T')[0],
    createdAt: new Date().toISOString(),
  };

  const settlements = readJSON(settlementsFile);
  settlements.push(settlement);
  writeJSON(settlementsFile, settlements);

  // Notification
  try {
    const notifs = readJSON(notifFile);
    notifs.unshift({
      id: uuidv4(),
      type: 'payment',
      message: `Settlement: ${fromMemberName} paid ₹${amount} to ${toMemberName}`,
      timestamp: new Date().toISOString(),
      read: false,
      forRole: 'admin',
    });
    writeJSON(notifFile, notifs.slice(0, 50));
  } catch {}

  res.status(201).json({ success: true, message: 'Settlement recorded', data: settlement });
});

// DELETE /api/balance/settle/:id – remove a settlement (admin)
router.delete('/settle/:id', requireAdmin, (req, res) => {
  const settlements = readJSON(settlementsFile);
  const idx = settlements.findIndex(s => s.id === req.params.id);
  if (idx === -1) return res.status(404).json({ success: false, message: 'Settlement not found' });
  settlements.splice(idx, 1);
  writeJSON(settlementsFile, settlements);
  res.json({ success: true, message: 'Settlement deleted' });
});

module.exports = { router, computeBalances, MEMBERS };
