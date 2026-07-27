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
    splitBetween: parseSplitBetween(r.splitBetween),
    date: r.date || new Date().toISOString().split('T')[0]
  }));
}

// GET /api/dashboard/stats
router.get('/stats', requireAuth, async (req, res) => {
  try {
    const { balances, totalExpenses, perPersonShare } = await computeBalances(req.session?.user);
    const groupMemberIds = (balances || []).map(b => b.userid);
    const allExpenses = await getExpenses();

    const isSuperAdmin = req.session?.user && (req.session?.user.role === 'super_admin' || req.session?.user.userid === '192472374');
    const isMemberOnly = req.session?.user && req.session?.user.role === 'member';

    const expenses = (allExpenses || []).filter(e => {
      if (isSuperAdmin) return true;
      if (isMemberOnly) {
        const splitList = parseSplitBetween(e.splitBetween);
        return e.paidBy === req.session.user.userid || splitList.includes(req.session.user.userid);
      }
      const splitList = parseSplitBetween(e.splitBetween);
      return groupMemberIds.includes(e.paidBy) || splitList.some(id => groupMemberIds.includes(id));
    });

    const now = new Date();
    const todayStr  = now.toISOString().split('T')[0];
    const monthStr  = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    const totalOwed     = (balances || []).filter(b => b.netBalance < 0).reduce((s, b) => s + (b.outstanding || 0), 0);
    const todayExpense  = expenses.filter(e => e.date === todayStr).reduce((s, e) => s + (e.amount || 0), 0);
    const monthExpense  = expenses.filter(e => e.date && e.date.startsWith(monthStr)).reduce((s, e) => s + (e.amount || 0), 0);

    const recentExpenses = [...expenses]
      .sort((a, b) => new Date(b.date || Date.now()) - new Date(a.date || Date.now()))
      .slice(0, 5)
      .map(e => {
        const splitList = parseSplitBetween(e.splitBetween);
        const count = splitList.length || 1;
        return {
          ...e,
          splitBetween: splitList,
          perPersonAmount: Math.round((e.amount || 0) / count),
        };
      });

    res.json({
      success: true,
      stats: {
        totalExpenses: totalExpenses || 0,
        perPersonShare: Math.round(perPersonShare || 0),
        totalOwed: totalOwed || 0,
        memberCount: (balances || []).length,
        todayExpense: todayExpense || 0,
        monthExpense: monthExpense || 0,
        expenseCount: expenses.length,
      },
      balances: balances || [],
      recentExpenses: recentExpenses || [],
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
    const groupMemberIds = (balances || []).map(b => b.userid);
    const allExpenses = await getExpenses();

    const isSuperAdmin = req.session?.user && (req.session?.user.role === 'super_admin' || req.session?.user.userid === '192472374');
    const isMemberOnly = req.session?.user && req.session?.user.role === 'member';

    const expenses = (allExpenses || []).filter(e => {
      if (isSuperAdmin) return true;
      if (isMemberOnly) {
        const splitList = parseSplitBetween(e.splitBetween);
        return e.paidBy === req.session.user.userid || splitList.includes(req.session.user.userid);
      }
      const splitList = parseSplitBetween(e.splitBetween);
      return groupMemberIds.includes(e.paidBy) || splitList.some(id => groupMemberIds.includes(id));
    });

    // Category breakdown
    const categoryMap = {};
    expenses.forEach(e => {
      const cat = e.category || 'General';
      categoryMap[cat] = (categoryMap[cat] || 0) + (e.amount || 0);
    });

    // Member paid (as bill payer)
    const memberMap = {};
    expenses.forEach(e => {
      const payer = e.paidByName || e.paidBy || 'Member';
      memberMap[payer] = (memberMap[payer] || 0) + (e.amount || 0);
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
      if (e.date) {
        const key = e.date.substring(0, 7);
        if (monthlyMap.hasOwnProperty(key)) monthlyMap[key] += (e.amount || 0);
      }
    });

    // Weekly bar
    const weeklyData = [];
    for (let i = 3; i >= 0; i--) {
      const wStart = new Date(now); wStart.setDate(wStart.getDate() - (i + 1) * 7);
      const wEnd   = new Date(now); wEnd.setDate(wEnd.getDate() - i * 7);
      const total  = expenses.filter(e => { const d = new Date(e.date || Date.now()); return d >= wStart && d < wEnd; }).reduce((s, e) => s + (e.amount || 0), 0);
      weeklyData.push({ label: `Week ${4 - i}`, total });
    }

    // Balance status per member (net balance bar)
    const balanceBar = (balances || []).map(b => ({
      name:       b.shortName || b.name,
      totalPaid:  b.totalPaid || 0,
      fairShare:  Math.round(b.totalShare || 0),
      netBalance: Math.round(b.netBalance || 0),
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
