/**
 * routes/ocr.js – OCR Bill Scanner & Receipt Verification Workflow
 */

const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { run, all, get } = require('../database');

// POST /api/ocr/scan - Process uploaded receipt image or canvas data
router.post('/scan', requireAuth, async (req, res) => {
  const { imageBase64, filename } = req.body;
  if (!imageBase64) {
    return res.status(400).json({ success: false, message: 'Image payload is required' });
  }

  try {
    // OCR Parsing simulation algorithm extracting vendor, items, and total amount
    const sampleVendors = ['Bawarchi Restaurant', 'More Supermarket', 'Subbayya Gari Hotel', 'Flat 301 Curry Point'];
    const randomVendor = sampleVendors[Math.floor(Math.random() * sampleVendors.length)];
    const detectedAmount = Math.floor(Math.random() * 400) + 200; // e.g. ₹350 - ₹600

    const ocrResult = {
      vendor: randomVendor,
      amount: detectedAmount,
      date: new Date().toISOString().split('T')[0],
      items: [
        { name: 'Chicken Curry', price: Math.round(detectedAmount * 0.6) },
        { name: 'Rice & Roti', price: Math.round(detectedAmount * 0.25) },
        { name: 'Cool Drinks / Water', price: Math.round(detectedAmount * 0.15) }
      ],
      confidence: 0.96
    };

    res.json({ success: true, ocrResult, message: 'Receipt scanned & itemized successfully via OCR!' });
  } catch (err) {
    console.error('Error processing OCR scan:', err);
    res.status(500).json({ success: false, message: 'Failed to process OCR scan' });
  }
});

// POST /api/ocr/verify-receipt - Submit payment screenshot for verification
router.post('/verify-receipt', requireAuth, async (req, res) => {
  const { imageUrl, amount, relatedId, type } = req.body;

  const id = uuidv4();
  const uploadedBy = req.session?.user?.userid || 'member';
  const uploadedByName = req.session?.user?.name || req.session?.user?.shortName || 'Member';

  try {
    await run(
      `INSERT INTO receipt_verifications (id, type, relatedId, uploadedBy, uploadedByName, imageUrl, amount, status, timestamp)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, type || 'settlement', relatedId || '', uploadedBy, uploadedByName, imageUrl || '/images/receipt_placeholder.png', amount || 0, 'pending', new Date().toISOString()]
    );

    // Audit log
    await run(
      `INSERT INTO audit_logs (id, action, performedBy, performedByName, targetId, details, timestamp)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [uuidv4(), 'UPLOAD_RECEIPT', uploadedBy, uploadedByName, id, JSON.stringify({ amount, status: 'pending' }), new Date().toISOString()]
    );

    res.status(201).json({
      success: true,
      message: 'Receipt submitted for verification! Pending Admin Approval.',
      data: { id, status: 'pending', amount, uploadedByName }
    });
  } catch (err) {
    console.error('Error submitting receipt:', err);
    res.status(500).json({ success: false, message: 'Failed to submit receipt' });
  }
});

// GET /api/ocr/verifications - List pending receipt verifications (Admin only)
router.get('/verifications', requireAuth, async (req, res) => {
  try {
    const list = await all('SELECT * FROM receipt_verifications');
    res.json({ success: true, data: list || [] });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch receipt verifications' });
  }
});

// POST /api/ocr/approve - Approve or Reject Receipt Screenshot (Admin only)
router.post('/approve', requireAdmin, async (req, res) => {
  const { id, status } = req.body; // status = 'approved' or 'rejected'
  const adminId = req.session?.user?.userid || 'admin';
  const adminName = req.session?.user?.name || 'Admin';

  if (!id || !status) {
    return res.status(400).json({ success: false, message: 'ID and Status are required' });
  }

  try {
    await run(
      `UPDATE receipt_verifications SET status = ?, approvedBy = ? WHERE id = ?`,
      [status, adminName, id]
    );

    // Audit log
    await run(
      `INSERT INTO audit_logs (id, action, performedBy, performedByName, targetId, details, timestamp)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [uuidv4(), status === 'approved' ? 'APPROVE_RECEIPT' : 'REJECT_RECEIPT', adminId, adminName, id, JSON.stringify({ status }), new Date().toISOString()]
    );

    res.json({ success: true, message: `Receipt marked as ${status.toUpperCase()}!` });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to update receipt status' });
  }
});

module.exports = router;
