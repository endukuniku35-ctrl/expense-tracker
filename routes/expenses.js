/**
 * Expenses Routes
 * GET    /api/expenses        - list all (auth required)
 * POST   /api/expenses        - add new (admin only)
 * PUT    /api/expenses/:id    - update (admin only)
 * DELETE /api/expenses/:id    - delete (admin only)
 */

const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const expensesFile = path.join(__dirname, '../data/expenses.json');
const notificationsFile = path.join(__dirname, '../data/notifications.json');
const usersFile = path.join(__dirname, '../data/users.json');

const ALL_MEMBERS = ['192472374', '192472343', '192411184', '192411185'];

function getExpenses() {
  return JSON.parse(fs.readFileSync(expensesFile, 'utf8'));
}

function saveExpenses(data) {
  fs.writeFileSync(expensesFile, JSON.stringify(data, null, 2));
}

function addNotification(message, type = 'expense') {
  try {
    const notifications = JSON.parse(fs.readFileSync(notificationsFile, 'utf8'));
    notifications.unshift({
      id: uuidv4(),
      type,
      message,
      timestamp: new Date().toISOString(),
      read: false,
      forRole: 'admin'
    });
    fs.writeFileSync(notificationsFile, JSON.stringify(notifications.slice(0, 50), null, 2));
  } catch (e) {}
}

function getMemberName(userid) {
  try {
    const users = JSON.parse(fs.readFileSync(usersFile, 'utf8'));
    const user = users.find(u => u.userid === userid);
    return user ? user.shortName : userid;
  } catch (e) { return userid; }
}

// GET /api/expenses - list with optional filters
router.get('/', requireAuth, (req, res) => {
  let expenses = getExpenses();
  const { search, month, member, category, sortBy, page = 1, limit = 20 } = req.query;

  // Search filter
  if (search) {
    const s = search.toLowerCase();
    expenses = expenses.filter(e =>
      e.title.toLowerCase().includes(s) ||
      e.description.toLowerCase().includes(s) ||
      e.paidByName.toLowerCase().includes(s) ||
      String(e.amount).includes(s) ||
      e.date.includes(s)
    );
  }

  // Month filter (format: YYYY-MM)
  if (month) {
    expenses = expenses.filter(e => e.date.startsWith(month));
  }

  // Member filter
  if (member) {
    expenses = expenses.filter(e => e.paidBy === member);
  }

  // Category filter
  if (category) {
    expenses = expenses.filter(e => e.category.toLowerCase() === category.toLowerCase());
  }

  // Sort
  if (sortBy === 'amount-asc') expenses.sort((a, b) => a.amount - b.amount);
  else if (sortBy === 'amount-desc') expenses.sort((a, b) => b.amount - a.amount);
  else expenses.sort((a, b) => new Date(b.date) - new Date(a.date)); // default: newest first

  // Totals before pagination
  const totalAmount = expenses.reduce((s, e) => s + e.amount, 0);
  const totalCount = expenses.length;

  // Pagination
  const start = (page - 1) * limit;
  const paginated = expenses.slice(start, start + Number(limit));

  res.json({
    success: true,
    data: paginated,
    meta: { total: totalCount, totalAmount, page: Number(page), limit: Number(limit), pages: Math.ceil(totalCount / limit) }
  });
});

// GET /api/expenses/all - all without pagination (for exports)
router.get('/all', requireAuth, (req, res) => {
  const expenses = getExpenses();
  expenses.sort((a, b) => new Date(b.date) - new Date(a.date));
  res.json({ success: true, data: expenses });
});

// POST /api/expenses - add new expense
router.post('/', requireAdmin, (req, res) => {
  const { title, description, amount, paidBy, category, date, notes, splitBetween } = req.body;

  if (!title || !amount || !paidBy || !date) {
    return res.status(400).json({ success: false, message: 'Title, amount, paid by, and date are required' });
  }

  const validSplit = (Array.isArray(splitBetween) && splitBetween.length > 0)
    ? splitBetween
    : ALL_MEMBERS;

  const newExpense = {
    id: uuidv4(),
    title: title.trim(),
    description: description || '',
    amount: parseFloat(amount),
    paidBy,
    paidByName: getMemberName(paidBy),
    splitBetween: validSplit,
    category: category || 'General',
    date,
    notes: notes || '',
    status: 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  const expenses = getExpenses();
  expenses.push(newExpense);
  saveExpenses(expenses);

  addNotification(`New expense added: ${newExpense.title} (₹${newExpense.amount} ÷ ${validSplit.length} members)`, 'expense');

  res.status(201).json({ success: true, message: 'Expense added successfully', data: newExpense });
});

// PUT /api/expenses/:id - update expense
router.put('/:id', requireAdmin, (req, res) => {
  const { id } = req.params;
  const { title, description, amount, paidBy, category, date, notes, splitBetween } = req.body;

  const expenses = getExpenses();
  const idx = expenses.findIndex(e => e.id === id);

  if (idx === -1) {
    return res.status(404).json({ success: false, message: 'Expense not found' });
  }

  const validSplit = (Array.isArray(splitBetween) && splitBetween.length > 0)
    ? splitBetween
    : (expenses[idx].splitBetween || ALL_MEMBERS);

  expenses[idx] = {
    ...expenses[idx],
    title: title || expenses[idx].title,
    description: description !== undefined ? description : expenses[idx].description,
    amount: amount !== undefined ? parseFloat(amount) : expenses[idx].amount,
    paidBy: paidBy || expenses[idx].paidBy,
    paidByName: paidBy ? getMemberName(paidBy) : expenses[idx].paidByName,
    splitBetween: validSplit,
    category: category || expenses[idx].category,
    date: date || expenses[idx].date,
    notes: notes !== undefined ? notes : expenses[idx].notes,
    updatedAt: new Date().toISOString()
  };

  saveExpenses(expenses);
  addNotification(`Expense updated: ${expenses[idx].title}`, 'expense');

  res.json({ success: true, message: 'Expense updated successfully', data: expenses[idx] });
});

// DELETE /api/expenses/:id - delete expense
router.delete('/:id', requireAdmin, (req, res) => {
  const { id } = req.params;
  const expenses = getExpenses();
  const idx = expenses.findIndex(e => e.id === id);

  if (idx === -1) {
    return res.status(404).json({ success: false, message: 'Expense not found' });
  }

  const deleted = expenses.splice(idx, 1)[0];
  saveExpenses(expenses);
  addNotification(`Expense deleted: ${deleted.title}`, 'expense');

  res.json({ success: true, message: 'Expense deleted successfully' });
});

module.exports = router;
