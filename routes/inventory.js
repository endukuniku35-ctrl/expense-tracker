/**
 * routes/inventory.js – Household Grocery & Inventory Management with AI Prediction
 */

const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { all, run } = require('../database');

// GET /api/inventory - Get list of inventory items with AI prediction
router.get('/', requireAuth, async (req, res) => {
  try {
    const items = await all('SELECT * FROM inventory');
    const itemsList = (items || []).map(item => {
      const remainingDays = item.remainingDays || 3;
      let suggestion = 'Stock OK';
      if (remainingDays <= 2) {
        suggestion = `⚠ Buy ${item.name} Tomorrow! (Remaining: ${remainingDays} days)`;
      } else if (remainingDays <= 4) {
        suggestion = `🛒 Restock ${item.name} soon (Remaining: ${remainingDays} days)`;
      }
      return {
        ...item,
        suggestion
      };
    });

    res.json({ success: true, data: itemsList });
  } catch (err) {
    console.error('Error fetching inventory:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch inventory' });
  }
});

// POST /api/inventory - Update or add inventory item (Admin only)
router.post('/', requireAdmin, async (req, res) => {
  const { id, name, quantity, unit, remainingDays, status } = req.body;
  if (!name || quantity === undefined) {
    return res.status(400).json({ success: false, message: 'Name and Quantity are required' });
  }

  const itemId = id || uuidv4();
  const parsedQty = parseFloat(quantity);
  const days = parseInt(remainingDays || 5);
  const itemStatus = status || (days <= 2 ? 'low' : 'ok');
  const today = new Date().toISOString().split('T')[0];
  const adminId = req.session?.user?.userid || 'admin';
  const adminName = req.session?.user?.name || 'Admin';

  try {
    await run(
      `INSERT INTO inventory (id, name, quantity, unit, remainingDays, status, lastPurchased)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [itemId, name.trim(), parsedQty, unit || 'kg', days, itemStatus, today]
    );

    // Audit log
    await run(
      `INSERT INTO audit_logs (id, action, performedBy, performedByName, targetId, details, timestamp)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [uuidv4(), 'UPDATE_INVENTORY', adminId, adminName, itemId, JSON.stringify({ name, quantity: parsedQty, days }), new Date().toISOString()]
    );

    res.json({ success: true, message: `Inventory item ${name} updated successfully!` });
  } catch (err) {
    console.error('Error updating inventory:', err);
    res.status(500).json({ success: false, message: 'Failed to update inventory' });
  }
});

module.exports = router;
