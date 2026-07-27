/**
 * routes/groups.js – Multi-House & QR Code Group Join Manager
 */

const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');

// GET /api/groups/list - List all available house/room groups
router.get('/list', requireAuth, async (req, res) => {
  const groups = [
    { id: 'group-192472374', name: 'Curry Flat Main (Jagan)', code: 'FLAT-MAIN', membersCount: 6, block: 'Block A' },
    { id: 'group-192472066', name: 'Flat 301 Roommates (anudeep)', code: 'FLAT-301', membersCount: 2, block: 'Block B' },
    { id: 'group-hostel-a', name: 'Hostel Block A (Curry Group)', code: 'HOSTEL-A', membersCount: 12, block: 'Hostel Block A' },
    { id: 'group-hostel-b', name: 'Hostel Block B (Curry Group)', code: 'HOSTEL-B', membersCount: 8, block: 'Hostel Block B' }
  ];

  res.json({ success: true, groups });
});

// GET /api/groups/qr-join/:code - Generate QR Join link
router.get('/qr-join/:code', requireAuth, async (req, res) => {
  const { code } = req.params;
  const joinUrl = `https://expense-tracker-77br.onrender.com/dashboard#join-${code}`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(joinUrl)}`;

  res.json({
    success: true,
    code,
    joinUrl,
    qrUrl,
    message: `Scan QR Code to join room group ${code}!`
  });
});

module.exports = router;
