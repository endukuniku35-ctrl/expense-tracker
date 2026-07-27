/**
 * routes/calendar.js – Interactive Monthly Calendar Expense Breakdown
 */

const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const { all } = require('../database');

router.get('/month', requireAuth, async (req, res) => {
  const month = req.query.month || new Date().toISOString().substring(0, 7); // e.g. '2026-07'

  try {
    const expenses = await all('SELECT * FROM expenses ORDER BY date ASC');
    const monthExpenses = (expenses || []).filter(e => e.date && e.date.startsWith(month));

    const dateMap = {};
    monthExpenses.forEach(e => {
      if (!dateMap[e.date]) {
        dateMap[e.date] = { total: 0, count: 0, items: [] };
      }
      dateMap[e.date].total += Number(e.amount || 0);
      dateMap[e.date].count += 1;
      dateMap[e.date].items.push({
        title: e.title,
        amount: e.amount,
        paidByName: e.paidByName || 'Member',
        category: e.category || 'General'
      });
    });

    res.json({ success: true, month, dateMap });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch calendar data' });
  }
});

module.exports = router;
