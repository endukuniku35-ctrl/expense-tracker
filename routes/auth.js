/**
 * Authentication Routes
 * POST /api/auth/login
 * POST /api/auth/logout
 * GET  /api/auth/me
 */

const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

const usersFile = path.join(__dirname, '../data/users.json');

function getUsers() {
  return JSON.parse(fs.readFileSync(usersFile, 'utf8'));
}

// POST /api/auth/login
router.post('/login', (req, res) => {
  const { userid, password } = req.body;

  if (!userid || !password) {
    return res.status(400).json({ success: false, message: 'User ID and password are required' });
  }

  const users = getUsers();
  const user = users.find(u => u.userid === userid.trim());

  if (!user) {
    return res.status(401).json({ success: false, message: 'Invalid User ID or Password' });
  }

  const passwordMatch = bcrypt.compareSync(password, user.password);
  if (!passwordMatch) {
    return res.status(401).json({ success: false, message: 'Invalid User ID or Password' });
  }

  // Store user in session (excluding password)
  req.session.user = {
    id: user.id,
    userid: user.userid,
    name: user.name,
    shortName: user.shortName,
    role: user.role,
    email: user.email,
    avatar: user.avatar,
    joinDate: user.joinDate
  };

  res.json({
    success: true,
    message: 'Login successful',
    user: req.session.user
  });
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) {
      return res.status(500).json({ success: false, message: 'Logout failed' });
    }
    res.json({ success: true, message: 'Logged out successfully' });
  });
});

// GET /api/auth/me
router.get('/me', (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ success: false, message: 'Not authenticated' });
  }
  res.json({ success: true, user: req.session.user });
});

module.exports = router;
