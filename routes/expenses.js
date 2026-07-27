/**
 * Expenses Routes
 * GET    /api/expenses        - list all (auth required)
 * POST   /api/expenses        - add new (admin only)
 * PUT    /api/expenses/:id    - update (admin only)
 * DELETE /api/expenses/:id    - delete (admin only)
 */

const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { getMembers } = require('./balance');
const { all, get, run } = require('../database');

const ALL_MEMBERS = ['192472374', '192472343', '192411184', '192411185'];

function parseSplitBetween(val) {
  if (Array.isArray(val) && val.length > 0) return val;
  if (typeof val === 'string' && val.trim()) {
    try {
      const p = JSON.parse(val);
      if (Array.isArray(p) && p.length > 0) return p;
    } catch (e) {}
  }
  return ALL_MEMBERS;
}

const { sendPushToAllSubscribers } = require('../push_service');

async function addNotification(message, type = 'expense') {
  try {
    await run(
      'INSERT INTO notifications (id, type, message, timestamp, read, forRole) VALUES (?, ?, ?, ?, 0, ?)',
      [uuidv4(), type, message, new Date().toISOString(), 'all']
    );
    sendPushToAllSubscribers('Curry Tracker 🍛', message).catch(() => {});
  } catch (e) {
    console.error('Error adding notification:', e);
  }
}

async function getMemberName(userid) {
  try {
    const user = await get('SELECT shortName FROM users WHERE userid = ?', [userid]);
    return user ? user.shortName : userid;
  } catch (e) { return userid; }
}

// GET /api/expenses - list with optional filters for group members
router.get('/', requireAuth, async (req, res) => {
  try {
    const groupMembers = await getMembers(req.session?.user);
    const groupMemberIds = groupMembers.map(m => m.userid);
    let rows = await all('SELECT * FROM expenses ORDER BY date DESC, createdAt DESC');
    
    let expenses = (rows || [])
      .map(r => ({
        ...r,
        amount: Number(r.amount || 0),
        splitBetween: parseSplitBetween(r.splitBetween)
      }))
      .filter(e => groupMemberIds.includes(e.paidBy) || (Array.isArray(e.splitBetween) && e.splitBetween.some(id => groupMemberIds.includes(id))));

    const { search, month, member, category, sortBy, page = 1, limit = 20 } = req.query;

    // Search filter
    if (search) {
      const s = search.toLowerCase();
      expenses = expenses.filter(e =>
        e.title.toLowerCase().includes(s) ||
        (e.description && e.description.toLowerCase().includes(s)) ||
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
    else if (sortBy === 'date-asc') expenses.sort((a, b) => new Date(a.date) - new Date(b.date));
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
  } catch (err) {
    console.error('Error fetching expenses:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch expenses' });
  }
});

// GET /api/expenses/all - all without pagination (for exports) for group members
router.get('/all', requireAuth, async (req, res) => {
  try {
    const groupMembers = await getMembers(req.session?.user);
    const groupMemberIds = groupMembers.map(m => m.userid);
    const rows = await all('SELECT * FROM expenses ORDER BY date DESC, createdAt DESC');
    const expenses = (rows || [])
      .map(r => ({
        ...r,
        amount: Number(r.amount || 0),
        splitBetween: parseSplitBetween(r.splitBetween)
      }))
      .filter(e => groupMemberIds.includes(e.paidBy) || (Array.isArray(e.splitBetween) && e.splitBetween.some(id => groupMemberIds.includes(id))));
    res.json({ success: true, data: expenses });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch expenses' });
  }
});

const { notifyNewExpense } = require('../telegram');

// POST /api/expenses - add new expense
router.post('/', requireAdmin, async (req, res) => {
  const { title, description, amount, paidBy, category, date, notes, splitBetween } = req.body;

  if (!title || !amount || !paidBy || !date) {
    return res.status(400).json({ success: false, message: 'Title, amount, paid by, and date are required' });
  }

  const validSplit = parseSplitBetween(splitBetween);
  const paidByName = await getMemberName(paidBy);
  const id = uuidv4();
  const now = new Date().toISOString();

  const newExpense = {
    id,
    title: title.trim(),
    description: description || '',
    amount: parseFloat(amount),
    paidBy,
    paidByName,
    splitBetween: validSplit,
    category: category || 'General',
    date,
    notes: notes || '',
    status: 'active',
    createdAt: now,
    updatedAt: now
  };

  try {
    await run(
      `INSERT INTO expenses (id, title, description, amount, paidBy, paidByName, splitBetween, category, date, notes, status, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        newExpense.title,
        newExpense.description,
        newExpense.amount,
        newExpense.paidBy,
        newExpense.paidByName,
        JSON.stringify(validSplit),
        newExpense.category,
        newExpense.date,
        newExpense.notes,
        newExpense.status,
        newExpense.createdAt,
        newExpense.updatedAt
      ]
    );

    await addNotification(`New expense added: ${newExpense.title} (₹${newExpense.amount} ÷ ${validSplit.length} members)`, 'expense');

    // Notify Telegram Bot
    notifyNewExpense(newExpense).catch(err => console.error('Telegram error:', err));

    res.status(201).json({ success: true, message: 'Expense added successfully', data: newExpense });
  } catch (err) {
    console.error('Error creating expense:', err);
    res.status(500).json({ success: false, message: 'Database error saving expense' });
  }
});

// PUT /api/expenses/:id - update expense
router.put('/:id', requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { title, description, amount, paidBy, category, date, notes, splitBetween } = req.body;

  try {
    const existing = await get('SELECT * FROM expenses WHERE id = ?', [id]);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Expense not found' });
    }

    const currentSplit = parseSplitBetween(existing.splitBetween);
    const validSplit = (Array.isArray(splitBetween) && splitBetween.length > 0)
      ? splitBetween
      : currentSplit;

    const newPaidBy = paidBy || existing.paidBy;
    const paidByName = paidBy ? await getMemberName(paidBy) : existing.paidByName;
    const updatedAt = new Date().toISOString();

    const updated = {
      id,
      title: title || existing.title,
      description: description !== undefined ? description : existing.description,
      amount: amount !== undefined ? parseFloat(amount) : Number(existing.amount),
      paidBy: newPaidBy,
      paidByName,
      splitBetween: validSplit,
      category: category || existing.category,
      date: date || existing.date,
      notes: notes !== undefined ? notes : existing.notes,
      status: existing.status,
      createdAt: existing.createdAt,
      updatedAt
    };

    await run(
      `UPDATE expenses
       SET title = ?, description = ?, amount = ?, paidBy = ?, paidByName = ?, splitBetween = ?, category = ?, date = ?, notes = ?, updatedAt = ?
       WHERE id = ?`,
      [
        updated.title,
        updated.description,
        updated.amount,
        updated.paidBy,
        updated.paidByName,
        JSON.stringify(validSplit),
        updated.category,
        updated.date,
        updated.notes,
        updated.updatedAt,
        id
      ]
    );

    await addNotification(`Expense updated: ${updated.title}`, 'expense');

    res.json({ success: true, message: 'Expense updated successfully', data: updated });
  } catch (err) {
    console.error('Error updating expense:', err);
    res.status(500).json({ success: false, message: 'Database error updating expense' });
  }
});

// DELETE /api/expenses/:id - delete expense
router.delete('/:id', requireAdmin, async (req, res) => {
  const { id } = req.params;

  try {
    const existing = await get('SELECT * FROM expenses WHERE id = ?', [id]);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Expense not found' });
    }

    await run('DELETE FROM expenses WHERE id = ?', [id]);
    await addNotification(`Expense deleted: ${existing.title}`, 'expense');

    res.json({ success: true, message: 'Expense deleted successfully' });
  } catch (err) {
    console.error('Error deleting expense:', err);
    res.status(500).json({ success: false, message: 'Database error deleting expense' });
  }
});

module.exports = router;
