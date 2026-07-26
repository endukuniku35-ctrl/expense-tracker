/**
 * Curry Expense Tracker - Main Server
 * Node.js + Express backend with session authentication
 */

const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Ensure data directory exists
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

// Trust reverse proxy (required for Render / Heroku HTTPS sessions)
app.set('trust proxy', 1);

// Middleware
app.use(cors({ credentials: true, origin: true }));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Session configuration
app.use(session({
  secret: 'curry-expense-tracker-secret-key-2024',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false, // set true in production with HTTPS
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Initialize default data files if they don't exist
const { initializeData } = require('./data/init');
initializeData();

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
  console.log(`  Mode: JSON File Storage`);
  console.log('================================================');
  console.log('  Admin Login: 192472374 / kandukurijagan@14062020');
  console.log('================================================');
});

module.exports = app;
