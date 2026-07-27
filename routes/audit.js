/**
 * routes/audit.js – System Audit Trail Logger & Change Tracking
 */

const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const { all } = require('../database');

// GET /api/audit - List system audit logs
router.get('/', requireAuth, async (req, res) => {
  try {
    const logs = await all('SELECT * FROM audit_logs ORDER BY timestamp DESC');
    res.json({ success: true, data: logs || [] });
  } catch (err) {
    console.error('Error fetching audit logs:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch audit logs' });
  }
});

module.exports = router;
