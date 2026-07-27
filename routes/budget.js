/**
 * routes/budget.js – Monthly Budget Planner & AI Expense Prediction
 */

const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { computeBalances } = require('./balance');
const { get, run, all } = require('../database');

// GET /api/budget - Get current monthly budget & spent analytics
router.get('/', requireAuth, async (req, res) => {
  const currentMonth = new Date().toISOString().substring(0, 7); // e.g. '2026-07'

  try {
    let budgetRecord = await get('SELECT * FROM budgets WHERE month = ?', [currentMonth]);
    if (!budgetRecord) {
      budgetRecord = {
        id: 'b-default',
        month: currentMonth,
        amount: 12000,
        categoryBudgets: { Lunch: 5000, Dinner: 4000, Groceries: 3000 }
      };
    }

    const { totalExpenses } = await computeBalances(req.session?.user);
    const spent = totalExpenses || 0;
    const budget = Number(budgetRecord.amount || 12000);
    const remaining = Math.max(0, budget - spent);
    const pct = budget > 0 ? Math.min(100, Math.round((spent / budget) * 100)) : 0;

    let status = 'green'; // Green < 70%, Yellow 70-90%, Red > 90%
    if (pct >= 90) status = 'red';
    else if (pct >= 70) status = 'yellow';

    // AI Prediction for next month
    const predictedNextMonth = Math.round(spent * 1.12);

    res.json({
      success: true,
      data: {
        month: currentMonth,
        budget,
        spent,
        remaining,
        percentage: pct,
        status,
        predictedNextMonth,
        categoryBudgets: budgetRecord.categoryBudgets || {}
      }
    });
  } catch (err) {
    console.error('Error fetching budget:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch budget' });
  }
});

// POST /api/budget - Set or update monthly budget (Admin only)
router.post('/', requireAdmin, async (req, res) => {
  const { amount, categoryBudgets } = req.body;
  const currentMonth = new Date().toISOString().substring(0, 7);

  if (!amount || parseFloat(amount) <= 0) {
    return res.status(400).json({ success: false, message: 'Valid budget amount is required' });
  }

  const id = uuidv4();
  const parsedAmount = parseFloat(amount);
  const adminId = req.session?.user?.userid || 'admin';
  const adminName = req.session?.user?.name || 'Admin';

  try {
    await run(
      `INSERT INTO budgets (id, month, amount, categoryBudgets, updatedAt)
       VALUES (?, ?, ?, ?, ?)`,
      [id, currentMonth, parsedAmount, JSON.stringify(categoryBudgets || { Lunch: 5000, Dinner: 4000, Groceries: 3000 }), new Date().toISOString()]
    );

    // Audit log
    await run(
      `INSERT INTO audit_logs (id, action, performedBy, performedByName, targetId, details, timestamp)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [uuidv4(), 'UPDATE_BUDGET', adminId, adminName, id, JSON.stringify({ amount: parsedAmount, month: currentMonth }), new Date().toISOString()]
    );

    res.json({ success: true, message: `Monthly budget updated to ₹${parsedAmount.toLocaleString('en-IN')}` });
  } catch (err) {
    console.error('Error setting budget:', err);
    res.status(500).json({ success: false, message: 'Failed to update budget' });
  }
});

module.exports = router;
