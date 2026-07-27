/**
 * Dashboard Routes (SQLite Backend)
 */

const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const { computeBalances } = require('./balance');
const { all } = require('../database');

const ALL_MEMBER_IDS = ['192472374', '192472343', '192411184', '192411185'];

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

async function getExpenses() {
  const rows = await all('SELECT * FROM expenses ORDER BY date DESC, createdAt DESC');
  return (rows || []).map(r => ({
    ...r,
    amount: Number(r.amount || 0),
    splitBetween: parseSplitBetween(r.splitBetween)
  }));
}

// GET /api/dashboard/stats
router.get('/stats', requireAuth, async (req, res) => {
  try {
    const { balances, totalExpenses, perPersonShare } = await computeBalances(req.session?.user);
    const groupMemberIds = balances.map(b => b.userid);
    const isMemberOnly = req.session?.user && req.session?.user.role === 'member';
    const expenses = allExpenses.filter(e => {
      if (isMemberOnly) {
        const splitList = Array.isArray(e.splitBetween) ? e.splitBetween : groupMemberIds;
        return e.paidBy === req.session.user.userid || splitList.includes(req.session.user.userid);
      }
      return groupMemberIds.includes(e.paidBy) || (Array.isArray(e.splitBetween) && e.splitBetween.some(id => groupMemberIds.includes(id)));
    });

    const now = new Date();
    const todayStr  = now.toISOString().split('T')[0];
    const monthStr  = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    const totalPaid     = balances.reduce((s, b) => s + b.settledIn + Math.max(0, b.netBalance <= 0 ? b.settledOut : 0), 0);
    const totalOwed     = balances.filter(b => b.netBalance < 0).reduce((s, b) => s + b.outstanding, 0);
    const todayExpense  = expenses.filter(e => e.date === todayStr).reduce((s, e) => s + e.amount, 0);
    const monthExpense  = expenses.filter(e => e.date.startsWith(monthStr)).reduce((s, e) => s + e.amount, 0);

    const recentExpenses = [...expenses]
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 5)
      .map(e => {
        const count = e.splitBetween.length;
        return {
          ...e,
          perPersonAmount: Math.round(e.amount / count),
        };
      });

    res.json({
      success: true,
      stats: {
        totalExpenses,
        perPersonShare: Math.round(perPersonShare),
        totalOwed,
        memberCount: balances.length || 4,
        todayExpense,
        monthExpense,
        expenseCount: expenses.length,
      },
      balances,
      recentExpenses,
    });
  } catch (err) {
    console.error('Error loading dashboard stats:', err);
    res.status(500).json({ success: false, message: 'Failed to load stats' });
  }
});

// GET /api/dashboard/charts
router.get('/charts', requireAuth, async (req, res) => {
  try {
    const { balances } = await computeBalances(req.session?.user);
    const groupMemberIds = balances.map(b => b.userid);
    const isMemberOnly = req.session?.user && req.session?.user.role === 'member';
    const expenses = allExpenses.filter(e => {
      if (isMemberOnly) {
        const splitList = Array.isArray(e.splitBetween) ? e.splitBetween : groupMemberIds;
        return e.paidBy === req.session.user.userid || splitList.includes(req.session.user.userid);
      }
      return groupMemberIds.includes(e.paidBy) || (Array.isArray(e.splitBetween) && e.splitBetween.some(id => groupMemberIds.includes(id)));
    });

    // Category breakdown
    const categoryMap = {};
    expenses.forEach(e => {
      categoryMap[e.category] = (categoryMap[e.category] || 0) + e.amount;
    });

    // Member paid (as bill payer)
    const memberMap = {};
    expenses.forEach(e => {
      memberMap[e.paidByName] = (memberMap[e.paidByName] || 0) + e.amount;
    });

    // Monthly trend (last 6 months)
    const monthlyMap = {};
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      monthlyMap[key] = 0;
    }
    expenses.forEach(e => {
      const key = e.date.substring(0, 7);
      if (monthlyMap.hasOwnProperty(key)) monthlyMap[key] += e.amount;
    });

    // Weekly bar
    const weeklyData = [];
    for (let i = 3; i >= 0; i--) {
      const wStart = new Date(now); wStart.setDate(wStart.getDate() - (i + 1) * 7);
      const wEnd   = new Date(now); wEnd.setDate(wEnd.getDate() - i * 7);
      const total  = expenses.filter(e => { const d = new Date(e.date); return d >= wStart && d < wEnd; }).reduce((s, e) => s + e.amount, 0);
      weeklyData.push({ label: `Week ${4 - i}`, total });
    }

    // Balance status per member (net balance bar)
    const balanceBar = balances.map(b => ({
      name:       b.shortName,
      totalPaid:  b.totalPaid,
      fairShare:  Math.round(b.totalShare),
      netBalance: Math.round(b.netBalance),
    }));

    res.json({
      success: true,
      charts: {
        categoryPie:    { labels: Object.keys(categoryMap), data: Object.values(categoryMap) },
        memberDoughnut: { labels: Object.keys(memberMap),   data: Object.values(memberMap) },
        monthlyLine:    { labels: Object.keys(monthlyMap),  data: Object.values(monthlyMap) },
        weeklyBar:      { labels: weeklyData.map(w => w.label), data: weeklyData.map(w => w.total) },
        balanceBar,
      },
    });
  } catch (err) {
    console.error('Error loading charts:', err);
    res.status(500).json({ success: false, message: 'Failed to load chart data' });
  }
});

module.exports = router;
