/**
 * Curry Expense Tracker - Main Server
 * Node.js + Express backend with fast performance & keep-alive optimizations
 */

const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const cors = require('cors');
const compression = require('compression');
const path = require('path');
const fs = require('fs');
const https = require('https');
const http = require('http');

const app = express();
const PORT = process.env.PORT || 3000;

// Ensure data directory exists
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

// Trust reverse proxy (required for Render / Heroku HTTPS sessions)
app.set('trust proxy', 1);

// GZIP Compression for blazing fast load speeds (~70% payload reduction)
app.use(compression());

// Middleware
app.use(cors({ credentials: true, origin: true }));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Serve static assets with 1-day browser caching for instant reloading
app.use(express.static(path.join(__dirname, 'public'), {
  maxAge: '1d',
  etag: true
}));

// Session configuration (30-minute inactivity timeout with rolling renewal)
app.use(session({
  secret: 'curry-expense-tracker-secret-key-2024',
  resave: false,
  rolling: true, // Renews cookie expiration on active user requests
  saveUninitialized: false,
  cookie: {
    secure: false, // set true in production with HTTPS
    httpOnly: true,
    maxAge: 30 * 60 * 1000 // 30 minutes inactivity timeout
  }
}));

// Initialize database tables & sample data
const { initDatabase } = require('./database');
initDatabase().catch(err => console.error('Database initialization error:', err));

// Lightweight Ping Endpoint for Keep-Alive
app.get('/ping', (req, res) => {
  res.status(200).send('PONG');
});

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/expenses', require('./routes/expenses'));
app.use('/api/payments', require('./routes/payments'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/members', require('./routes/members'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/balance', require('./routes/balance').router);

// Serve login page at root
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Serve dashboard for authenticated users
app.get('/dashboard', (req, res) => {
  if (!req.session.user) {
    return res.redirect('/');
  }
  res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

// Catch-all: redirect to login
app.get('*', (req, res) => {
  res.redirect('/');
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, message: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log('================================================');
  console.log('  🍛 Curry Expense Tracker - Server Started');
  console.log('================================================');
  console.log(`  URL: http://localhost:${PORT}`);
  console.log(`  Mode: Fast-Performance Engine`);
  console.log('================================================');

  // Automatic 10-Minute Keep-Alive Self-Ping to Prevent Cloud Spin-Down Delay
  const RENDER_URL = process.env.RENDER_EXTERNAL_URL || 'https://expense-tracker-77br.onrender.com';
  setInterval(() => {
    try {
      const client = RENDER_URL.startsWith('https') ? https : http;
      client.get(`${RENDER_URL}/ping`, (res) => {
        // Keep warm success
      }).on('error', () => {});
    } catch (e) {}
  }, 10 * 60 * 1000); // Ping every 10 minutes
});

module.exports = app;
