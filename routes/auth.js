/**
 * Authentication Routes (SQLite & Session Backend)
 * POST /api/auth/login
 * POST /api/auth/logout
 * POST /api/auth/refresh-session
 * GET  /api/auth/me
 */

const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { get, all } = require('../database');

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { userid, password } = req.body;

  if (!userid || !password) {
    return res.status(400).json({ success: false, message: 'User ID and password are required' });
  }

  try {
    const user = await get('SELECT * FROM users WHERE userid = ?', [userid.trim()]);

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
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ success: false, message: 'Database error during login' });
  }
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

// POST /api/auth/refresh-session - Extend active session
router.post('/refresh-session', (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ success: false, message: 'Session expired' });
  }
  req.session.touch();
  res.json({ success: true, message: 'Session extended' });
});

// GET /api/auth/me
router.get('/me', (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ success: false, message: 'Not authenticated' });
  }
  const maxAge = req.session.cookie.maxAge || 30 * 60 * 1000;
  res.json({ success: true, user: req.session.user, sessionMaxAge: maxAge });
});

module.exports = router;
