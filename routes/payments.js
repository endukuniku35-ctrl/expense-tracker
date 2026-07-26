/**
 * Payments Routes
 * GET /api/payments         - get all payment records
 * PUT /api/payments/:id     - update payment status (admin only)
 * GET /api/payments/summary - summary per member
 */

const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const paymentsFile = path.join(__dirname, '../data/payments.json');
const expensesFile = path.join(__dirname, '../data/expenses.json');
const usersFile = path.join(__dirname, '../data/users.json');
const notificationsFile = path.join(__dirname, '../data/notifications.json');
const { v4: uuidv4 } = require('uuid');

function getPayments() {
  return JSON.parse(fs.readFileSync(paymentsFile, 'utf8'));
}

function savePayments(data) {
  fs.writeFileSync(paymentsFile, JSON.stringify(data, null, 2));
}

function getExpenses() {
  return JSON.parse(fs.readFileSync(expensesFile, 'utf8'));
}

function getUsers() {
  return JSON.parse(fs.readFileSync(usersFile, 'utf8'));
}

// GET /api/payments - list all payments with computed data
router.get('/', requireAuth, (req, res) => {
  const payments = getPayments();
  const expenses = getExpenses();
  const users = getUsers().filter(u => u.role !== 'superadmin');

  // Compute actual contributions per member from expenses
  const contributions = {};
  expenses.forEach(exp => {
    if (!contributions[exp.paidBy]) contributions[exp.paidBy] = 0;
    contributions[exp.paidBy] += exp.amount;
  });

  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);
  const perPersonShare = totalExpenses / 4;

  const enriched = payments.map(p => {
    const totalContributed = contributions[p.memberId] || 0;
    const netAmount = totalContributed - perPersonShare;
    const percentage = totalContributed > 0 ? Math.min(100, Math.round((p.paidAmount / totalContributed) * 100)) : 0;
    return {
      ...p,
      totalContributed,
      perPersonShare: Math.round(perPersonShare),
      netBalance: Math.round(netAmount),
      percentage
    };
  });

  res.json({ success: true, data: enriched, totalExpenses, perPersonShare: Math.round(perPersonShare) });
});

// GET /api/payments/summary - quick summary
router.get('/summary', requireAuth, (req, res) => {
  const payments = getPayments();
  const totalPaid = payments.reduce((s, p) => s + p.paidAmount, 0);
  const totalPending = payments.reduce((s, p) => s + Math.max(0, p.amount - p.paidAmount), 0);
  res.json({ success: true, totalPaid, totalPending, payments });
});

// PUT /api/payments/:id - update payment
router.put('/:id', requireAdmin, (req, res) => {
  const { id } = req.params;
  const { paidAmount, status, notes } = req.body;

  const payments = getPayments();
  const idx = payments.findIndex(p => p.id === id);

  if (idx === -1) {
    return res.status(404).json({ success: false, message: 'Payment record not found' });
  }

  const oldStatus = payments[idx].status;
  payments[idx] = {
    ...payments[idx],
    paidAmount: paidAmount !== undefined ? parseFloat(paidAmount) : payments[idx].paidAmount,
    status: status || payments[idx].status,
    notes: notes !== undefined ? notes : payments[idx].notes,
    lastPaymentDate: new Date().toISOString().split('T')[0],
    updatedAt: new Date().toISOString()
  };

  // Auto-compute status if paidAmount changed
  if (paidAmount !== undefined) {
    const pa = parseFloat(paidAmount);
    if (pa >= payments[idx].amount) payments[idx].status = 'paid';
    else if (pa > 0) payments[idx].status = 'partial';
    else payments[idx].status = 'pending';
  }

  savePayments(payments);

  // Add notification
  try {
    const notifications = JSON.parse(fs.readFileSync(notificationsFile, 'utf8'));
    notifications.unshift({
      id: uuidv4(),
      type: 'payment',
      message: `Payment updated for ${payments[idx].memberName}: ₹${payments[idx].paidAmount} (${payments[idx].status})`,
      timestamp: new Date().toISOString(),
      read: false,
      forRole: 'admin'
    });
    fs.writeFileSync(notificationsFile, JSON.stringify(notifications.slice(0, 50), null, 2));
  } catch (e) {}

  res.json({ success: true, message: 'Payment updated successfully', data: payments[idx] });
});

module.exports = router;
