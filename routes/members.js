/**
 * Members Routes — uses balance engine
 */
const express = require('express');
const router  = express.Router();
const { requireAuth } = require('../middleware/auth');
const { computeBalances } = require('./balance');

router.get('/', requireAuth, (req, res) => {
  const { balances, totalExpenses, perPersonShare } = computeBalances();
  res.json({ success: true, data: balances, totalExpenses, perPersonShare });
});

module.exports = router;
