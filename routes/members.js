/**
 * Members Routes (SQLite Backend)
 */
const express = require('express');
const router  = express.Router();
const { requireAuth } = require('../middleware/auth');
const { computeBalances } = require('./balance');

router.get('/', requireAuth, async (req, res) => {
  try {
    const { balances, totalExpenses, perPersonShare } = await computeBalances();
    res.json({ success: true, data: balances, totalExpenses, perPersonShare });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch members balance' });
  }
});

module.exports = router;
