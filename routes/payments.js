/**
 * Payments Routes (SQLite & JSON Backend)
 * Integrates live balance engine + settlement transaction history
 */

const express = require('express');
const router = express.Router();
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { computeBalances } = require('./balance');

// GET /api/payments - get live payment status & settlement history
router.get('/', requireAuth, async (req, res) => {
  try {
    const { balances, totalExpenses, perPersonShare, settlements } = await computeBalances();
    res.json({
      success: true,
      data: balances,
      settlements: settlements || [],
      totalExpenses,
      perPersonShare: Math.round(perPersonShare)
    });
  } catch (err) {
    console.error('Error fetching payments:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch payment status' });
  }
});

// GET /api/payments/summary - quick summary
router.get('/summary', requireAuth, async (req, res) => {
  try {
    const { balances, settlements } = await computeBalances();
    const totalPaid = balances.reduce((s, b) => s + b.settledOut + b.totalPaid, 0);
    const totalPending = balances.filter(b => b.netBalance < 0).reduce((s, b) => s + b.outstanding, 0);
    res.json({ success: true, totalPaid, totalPending, balances, settlements });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch payment summary' });
  }
});

module.exports = router;
