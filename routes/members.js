/**
 * Members Routes (SQLite & JSON Backend)
 * GET  /api/members        - Get all members with dynamic balances
 * POST /api/members        - Add new member (Admin only)
 */

const express = require('express');
const router  = express.Router();
const bcrypt  = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { computeBalances } = require('./balance');
const { get, run, all } = require('../database');

// GET /api/members - List members and their balance sheets
router.get('/', requireAuth, async (req, res) => {
  try {
    const { balances, totalExpenses, perPersonShare } = await computeBalances();
    res.json({ success: true, data: balances, totalExpenses, perPersonShare });
  } catch (err) {
    console.error('Error fetching members balance:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch members balance' });
  }
// GET /api/members/credentials - Get registered logins & credentials (Admin only)
router.get('/credentials', requireAdmin, async (req, res) => {
  try {
    const users = await all('SELECT * FROM users');
    const userList = (users || []).map(u => ({
      id: u.id,
      userid: u.userid,
      name: u.name,
      shortName: u.shortName || u.name,
      role: u.role || 'member',
      email: u.email,
      avatar: u.avatar,
      joinDate: u.joinDate,
      password: u.rawPassword || '••••••••'
    }));
    res.json({ success: true, data: userList });
  } catch (err) {
    console.error('Error fetching member credentials:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch credentials list' });
  }
});

// POST /api/members - Add new member (Admin only)
router.post('/', requireAdmin, async (req, res) => {
  const { userid, name, password, role, email } = req.body;

  if (!userid || !name || !password) {
    return res.status(400).json({ success: false, message: 'User ID, Name, and Password are required' });
  }

  try {
    const existing = await get('SELECT * FROM users WHERE userid = ?', [userid.trim()]);
    if (existing) {
      return res.status(400).json({ success: false, message: `Member with User ID ${userid.trim()} already exists` });
    }

    const id = uuidv4();
    const salt = bcrypt.genSaltSync(10);
    const hashedPassword = bcrypt.hashSync(password, salt);
    const shortName = name.trim().split(' ')[0];
    const avatar = shortName.substring(0, 2).toUpperCase();
    const userRole = role === 'admin' ? 'admin' : 'member';
    const userEmail = email || `${userid.trim()}@curry.local`;
    const joinDate = new Date().toISOString().split('T')[0];

    await run(
      `INSERT INTO users (id, userid, password, name, shortName, role, email, avatar, joinDate)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, userid.trim(), hashedPassword, name.trim(), shortName, userRole, userEmail, avatar, joinDate, password.trim()]
    );

    // Notification
    await run(
      `INSERT INTO notifications (id, type, message, timestamp, read, forRole) VALUES (?, ?, ?, ?, 0, ?)`,
      [uuidv4(), 'system', `New member added: ${name.trim()} (${userid.trim()})`, new Date().toISOString(), 'admin']
    );

    res.status(201).json({
      success: true,
      message: `Member ${name.trim()} added successfully!`,
      data: { id, userid: userid.trim(), name: name.trim(), shortName, role: userRole, avatar, joinDate, password: password.trim() }
    });
  } catch (err) {
    console.error('Error adding member:', err);
    res.status(500).json({ success: false, message: 'Database error adding member' });
  }
});

// POST /api/members/reset-password - Reset member password (Admin only)
router.post('/reset-password', requireAdmin, async (req, res) => {
  const { userid, newPassword } = req.body;
  if (!userid || !newPassword) {
    return res.status(400).json({ success: false, message: 'User ID and New Password are required' });
  }

  try {
    const fs = require('fs');
    const path = require('path');
    const dataPath = path.join(__dirname, '../data/users.json');
    let users = [];
    if (fs.existsSync(dataPath)) {
      users = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
    }

    const user = users.find(u => u.userid === userid.trim());
    if (!user) {
      return res.status(404).json({ success: false, message: 'Member not found' });
    }

    const salt = bcrypt.genSaltSync(10);
    user.password = bcrypt.hashSync(newPassword.trim(), salt);
    user.rawPassword = newPassword.trim();
    fs.writeFileSync(dataPath, JSON.stringify(users, null, 2));

    res.json({ success: true, message: `Password for ${user.name} (${user.userid}) updated successfully!` });
  } catch (err) {
    console.error('Error resetting password:', err);
    res.status(500).json({ success: false, message: 'Failed to reset password' });
  }
});

module.exports = router;
