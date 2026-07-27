/**
 * routes/balance.js (SQLite & JSON Backend)
 * Core logic: curry expenses split among participating members of each group.
 */

const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { all, get, run } = require('../database');
const { sendPushToAllSubscribers } = require('../push_service');

const MEMBERS = ['192472374', '192472343', '192411184', '192411185'];

async function getMembers(currentUser) {
  const users = await all('SELECT * FROM users');
  let userList = (users || []).map(u => ({
    userid: u.userid,
    name: u.name,
    shortName: u.shortName || u.name,
    avatar: u.avatar || (u.shortName ? u.shortName.substring(0, 2).toUpperCase() : 'U'),
    role: u.role || 'member',
    createdBy: u.createdBy || '192472374',
    createdByName: u.createdByName || 'Jagan (Main Admin)'
  }));

  if (currentUser) {
    const isSuperAdmin = currentUser.role === 'super_admin' || currentUser.userid === '192472374';
    if (isSuperAdmin) {
      // Main Super Admin Jagan sees all members across all groups
      return userList;
    }
    // Secondary admin or member: find their specific group members
    const adminId = currentUser.role === 'admin' ? currentUser.userid : (currentUser.createdBy || '192472374');
    userList = userList.filter(u => u.userid === adminId || u.createdBy === adminId);
  }

  return userList;
}

function parseSplitBetween(val, defaultMemberIds) {
  if (Array.isArray(val) && val.length > 0) return val;
  if (typeof val === 'string' && val.trim()) {
    try {
      const p = JSON.parse(val);
      if (Array.isArray(p) && p.length > 0) return p;
    } catch (e) {}
  }
  return defaultMemberIds || MEMBERS;
}

/**
 * Compute the full balance sheet from expenses + settlements for the requesting user's group
 */
async function computeBalances(currentUser) {
  try {
    const members = await getMembers(currentUser);
    const groupMemberIds = members.map(m => m.userid);
    const expRows = await all('SELECT * FROM expenses ORDER BY date DESC, createdAt DESC');
    const setRows = await all('SELECT * FROM settlements ORDER BY date DESC, createdAt DESC');

    const isSuperAdmin = currentUser && (currentUser.role === 'super_admin' || currentUser.userid === '192472374');
    const isMemberOnly = currentUser && currentUser.role === 'member';

    const expenses = (expRows || [])
      .map(r => ({
        ...r,
        amount: Number(r.amount || 0),
        splitBetween: parseSplitBetween(r.splitBetween, groupMemberIds)
      }))
      .filter(e => {
        if (isSuperAdmin) return true; // Super Admin Jagan sees ALL expenses
        if (isMemberOnly) {
          const splitList = Array.isArray(e.splitBetween) ? e.splitBetween : groupMemberIds;
          return e.paidBy === currentUser.userid || splitList.includes(currentUser.userid);
        }
        return groupMemberIds.includes(e.paidBy) || (Array.isArray(e.splitBetween) && e.splitBetween.some(id => groupMemberIds.includes(id)));
      });

    const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);
    const perPersonShare = members.length > 0 ? (totalExpenses / members.length) : 0;

    // Per-member stats
    const balances = {};
    members.forEach(m => {
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
      const splitList = parseSplitBetween(e.splitBetween, groupMemberIds).filter(uid => groupMemberIds.includes(uid));
      const effectiveSplitList = splitList.length > 0 ? splitList : groupMemberIds;
      const perPersonForMeal = e.amount / effectiveSplitList.length;

      if (balances[e.paidBy]) {
        balances[e.paidBy].totalPaid    += e.amount;
        balances[e.paidBy].expenseCount += 1;
        balances[e.paidBy].expenses.push({
          ...e,
          splitCount: effectiveSplitList.length,
          perPersonShare: perPersonForMeal
        });
      }

      effectiveSplitList.forEach(uid => {
        if (balances[uid]) {
          balances[uid].totalShare += perPersonForMeal;
          balances[uid].mealsCount += 1;
        }
      });
    });

    // Settlements
    const groupSettlements = (setRows || []).filter(s => groupMemberIds.includes(s.fromMemberId) || groupMemberIds.includes(s.toMemberId));
    groupSettlements.forEach(s => {
      const amt = Number(s.amount || 0);
      if (balances[s.fromMemberId]) balances[s.fromMemberId].settledOut += amt;
      if (balances[s.toMemberId])   balances[s.toMemberId].settledIn   += amt;
    });

    // Finalize balance & status
    Object.values(balances).forEach(b => {
      b.initialNet  = b.totalPaid - b.totalShare;
      b.netBalance  = Math.round((b.totalPaid + b.settledOut) - (b.totalShare + b.settledIn));
      b.outstanding = Math.abs(b.netBalance);
      b.status      = b.outstanding <= 0 ? 'settled' : (b.netBalance < 0 ? 'owes' : 'to-receive');

      const totalPaidWithSettlements = b.totalPaid + b.settledOut;
      b.percentage = b.totalShare > 0
        ? Math.min(100, Math.round((totalPaidWithSettlements / b.totalShare) * 100))
        : 0;
    });

    return { balances: Object.values(balances), totalExpenses, perPersonShare, settlements: groupSettlements };
  } catch (err) {
    console.error('❌ CRITICAL ERROR IN computeBalances:', err);
    throw err;
  }
}

// GET /api/balance  – full balance sheet for user group
router.get('/', requireAuth, async (req, res) => {
  try {
    const data = await computeBalances(req.session?.user);
    res.json({ success: true, ...data });
  } catch (err) {
    console.error('Error in /api/balance:', err);
    res.status(500).json({ success: false, message: 'Failed to compute balance' });
  }
});

// GET /api/balance/summary – quick summary
router.get('/summary', requireAuth, async (req, res) => {
  try {
    const { balances, totalExpenses, perPersonShare } = await computeBalances(req.session?.user);
    res.json({ success: true, balances, totalExpenses, perPersonShare });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch balance summary' });
  }
});

// GET /api/balance/settlements – all settlements for user group
router.get('/settlements', requireAuth, async (req, res) => {
  try {
    const members = await getMembers(req.session?.user);
    const groupMemberIds = members.map(m => m.userid);
    const settlements = await all('SELECT * FROM settlements ORDER BY date DESC, createdAt DESC');
    const groupSettlements = (settlements || []).filter(s => groupMemberIds.includes(s.fromMemberId) || groupMemberIds.includes(s.toMemberId));
    res.json({ success: true, data: groupSettlements });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch settlements' });
  }
});

// POST /api/balance/settle – record a settlement payment
router.post('/settle', requireAuth, async (req, res) => {
  const { fromMemberId, fromMemberName, toMemberId, toMemberName, amount, notes, date } = req.body;

  if (!fromMemberId || !toMemberId || !amount || parseFloat(amount) <= 0) {
    return res.status(400).json({ success: false, message: 'from, to, and amount are required' });
  }

  const id = uuidv4();
  const createdAt = new Date().toISOString();
  const settlementDate = date || new Date().toISOString().split('T')[0];
  const parsedAmount = parseFloat(amount);

  try {
    await run(
      `INSERT INTO settlements (id, fromMemberId, fromMemberName, toMemberId, toMemberName, amount, notes, date, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, fromMemberId, fromMemberName, toMemberId, toMemberName, parsedAmount, notes || '', settlementDate, createdAt]
    );

    const message = `💸 Payment Recorded: ${fromMemberName} paid ₹${parsedAmount.toLocaleString('en-IN')} to ${toMemberName}`;
    await run(
      `INSERT INTO notifications (id, type, message, timestamp, read, forRole) VALUES (?, ?, ?, ?, 0, ?)`,
      [uuidv4(), 'payment', message, createdAt, 'all']
    );

    sendPushToAllSubscribers('Curry Tracker 🍛', message).catch(() => {});

    res.status(201).json({
      success: true,
      message: `Settlement recorded: ₹${parsedAmount} from ${fromMemberName} to ${toMemberName}`,
      data: { id, fromMemberId, fromMemberName, toMemberId, toMemberName, amount: parsedAmount, notes, date: settlementDate, createdAt }
    });
  } catch (err) {
    console.error('Error recording settlement:', err);
    res.status(500).json({ success: false, message: 'Failed to record settlement' });
  }
});

// DELETE /api/balance/settle/:id – delete settlement transaction
router.delete('/settle/:id', requireAdmin, async (req, res) => {
  try {
    await run('DELETE FROM settlements WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Settlement record deleted' });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Failed to delete settlement' });
  }
});

module.exports = { router, computeBalances, getMembers };
