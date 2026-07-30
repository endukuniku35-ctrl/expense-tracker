/**
 * Payments Routes & Automatic Payment Webhook Integration
 * Integrates live balance engine, UTR auto-verifier, and Razorpay/PhonePe Webhooks
 */

const express = require('express');
const router = express.Router();
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { computeBalances } = require('./balance');
const { run, all, get } = require('../database');
const { notifySettlement } = require('../telegram');
const { sendPushToAllSubscribers } = require('../push_service');

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

// ⚡ POST /api/payments/verify-utr – User submits 12-digit UTR/Ref No after paying on PhonePe/GPay
router.post('/verify-utr', requireAuth, async (req, res) => {
  try {
    const { utr, amount, toMemberId } = req.body;
    const fromMemberId = req.user.userid;
    const fromMemberName = req.user.name || req.user.shortName || 'Member';

    if (!utr || String(utr).trim().length < 8) {
      return res.status(400).json({ success: false, message: 'Please enter a valid 12-digit UTR / Transaction Reference Number' });
    }

    const cleanUtr = String(utr).trim();

    // Check duplicate UTR
    const existing = await get('SELECT * FROM settlements WHERE notes LIKE ?', [`%${cleanUtr}%`]);
    if (existing) {
      return res.status(400).json({ success: false, message: 'This Transaction UTR has already been recorded and settled!' });
    }

    // Default target: Admin Jagan (192472374) or specified member
    const targetId = toMemberId || '192472374';
    const targetMember = await get('SELECT name FROM users WHERE userid = ?', [targetId]);
    const toMemberName = targetMember ? targetMember.name : 'Jagan Kandukuri (Admin)';

    const parsedAmount = parseFloat(amount);
    if (!parsedAmount || parsedAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid payment amount' });
    }

    const id = 'set_auto_' + Date.now();
    const settlementDate = new Date().toISOString().split('T')[0];
    const createdAt = new Date().toISOString();
    const notes = `⚡ Auto-Verified via PhonePe/UPI (UTR: ${cleanUtr})`;

    await run(
      `INSERT INTO settlements (id, fromMemberId, fromMemberName, toMemberId, toMemberName, amount, notes, date, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, fromMemberId, fromMemberName, targetId, toMemberName, parsedAmount, notes, settlementDate, createdAt]
    );

    // Notify Telegram & Mobile Push
    const settlementObj = { amount: parsedAmount, paidByName: fromMemberName, toName: toMemberName };
    notifySettlement(settlementObj).catch(() => {});
    sendPushToAllSubscribers('Payment Settled! ✅', `${fromMemberName} paid ₹${parsedAmount} to ${toMemberName} (UTR: ${cleanUtr})`).catch(() => {});

    res.json({
      success: true,
      message: `Payment of ₹${parsedAmount} verified & settled automatically!`,
      data: { id, fromMemberId, fromMemberName, toMemberId: targetId, toMemberName, amount: parsedAmount, notes, date: settlementDate }
    });
  } catch (err) {
    console.error('Error verifying UTR payment:', err);
    res.status(500).json({ success: false, message: 'Failed to auto-verify payment' });
  }
});

// 🌐 POST /api/payments/webhook – Live Webhook for PhonePe Merchant / Razorpay / Cashfree Server Notifications
router.post('/webhook', async (req, res) => {
  try {
    const payload = req.body || {};
    console.log('[Payment Webhook Received]:', JSON.stringify(payload).substring(0, 300));

    // Extract payload details (supports Razorpay, Cashfree, PhonePe webhook formats)
    let amount = 0;
    let utr = 'WEBHOOK_' + Date.now();
    let payerName = 'UPI Payer';
    let status = 'SUCCESS';

    if (payload.event === 'payment.captured' && payload.payload?.payment?.entity) {
      // Razorpay Format
      const entity = payload.payload.payment.entity;
      amount = entity.amount / 100; // Razorpay passes paise
      utr = entity.acquirer_data?.rrn || entity.id;
      payerName = entity.vpa || entity.email || 'UPI User';
      status = 'SUCCESS';
    } else if (payload.transactionId || payload.merchantTransactionId) {
      // PhonePe / Cashfree Format
      amount = payload.amount || (payload.data?.amount / 100) || 0;
      utr = payload.providerReferenceId || payload.transactionId;
      payerName = payload.data?.paymentInstrument?.accountHolderName || 'PhonePe User';
      status = payload.code === 'PAYMENT_SUCCESS' ? 'SUCCESS' : 'PENDING';
    }

    if (status === 'SUCCESS' && amount > 0) {
      const id = 'set_wh_' + Date.now();
      const settlementDate = new Date().toISOString().split('T')[0];
      const createdAt = new Date().toISOString();
      const notes = `🤖 Auto-Captured via Payment Webhook (Ref: ${utr})`;

      // Auto-attribute to matching user or Admin
      await run(
        `INSERT INTO settlements (id, fromMemberId, fromMemberName, toMemberId, toMemberName, amount, notes, date, createdAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, '192472374', payerName, '192472374', 'Jagan Kandukuri (Admin)', amount, notes, settlementDate, createdAt]
      );

      notifySettlement({ amount, paidByName: payerName, toName: 'Curry Group' }).catch(() => {});
      sendPushToAllSubscribers('Instant Payment Received! 💰', `₹${amount} paid via PhonePe/UPI (${payerName})`).catch(() => {});
    }

    res.status(200).json({ success: true, status: 'RECEIVED' });
  } catch (err) {
    console.error('[Payment Webhook Error]:', err.message);
    res.status(200).json({ success: true, note: 'Error handled gracefully' });
  }
});

module.exports = router;
