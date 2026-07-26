/**
 * database.js – SQLite Backend Database Engine
 * Persistent SQL storage for Users, Expenses, Settlements & Notifications.
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');

const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'curry_tracker.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('❌ Error opening SQLite database:', err.message);
  } else {
    console.log('✅ Connected to SQLite database:', dbPath);
  }
});

// Helper for Promisified Queries
function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
}

function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

// Initialize Tables and Sample Data
async function initDatabase() {
  // 1. Users Table
  await run(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      userid TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      name TEXT NOT NULL,
      shortName TEXT,
      role TEXT DEFAULT 'member',
      email TEXT,
      avatar TEXT,
      joinDate TEXT
    )
  `);

  // 2. Expenses Table
  await run(`
    CREATE TABLE IF NOT EXISTS expenses (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      amount REAL NOT NULL,
      paidBy TEXT NOT NULL,
      paidByName TEXT NOT NULL,
      splitBetween TEXT NOT NULL,
      category TEXT DEFAULT 'General',
      date TEXT NOT NULL,
      notes TEXT,
      status TEXT DEFAULT 'active',
      createdAt TEXT,
      updatedAt TEXT
    )
  `);

  // 3. Settlements Table
  await run(`
    CREATE TABLE IF NOT EXISTS settlements (
      id TEXT PRIMARY KEY,
      fromMemberId TEXT NOT NULL,
      fromMemberName TEXT NOT NULL,
      toMemberId TEXT NOT NULL,
      toMemberName TEXT NOT NULL,
      amount REAL NOT NULL,
      notes TEXT,
      date TEXT NOT NULL,
      createdAt TEXT
    )
  `);

  // 4. Notifications Table
  await run(`
    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      message TEXT NOT NULL,
      timestamp TEXT NOT NULL,
      read INTEGER DEFAULT 0,
      forRole TEXT DEFAULT 'admin'
    )
  `);

  // Populate Users if empty
  const userCount = await get('SELECT COUNT(*) as count FROM users');
  if (userCount.count === 0) {
    const salt = bcrypt.genSaltSync(10);
    const users = [
      ['1', '192472374', bcrypt.hashSync('kandukurijagan@14062020', salt), 'Jagan Kandukuri', 'Jagan', 'admin', 'jagan@curry.local', 'JK', '2024-01-01'],
      ['2', '192472343', bcrypt.hashSync('nallamalasagar', salt), 'Sagar Nallamala', 'Sagar', 'member', 'sagar@curry.local', 'SN', '2024-01-01'],
      ['3', '192411184', bcrypt.hashSync('prathap', salt), 'Prathap Kumar', 'Prathap', 'member', 'prathap@curry.local', 'PK', '2024-01-01'],
      ['4', '192411185', bcrypt.hashSync('bharath', salt), 'Bharath Reddy', 'Bharath', 'member', 'bharath@curry.local', 'BR', '2024-01-01']
    ];
    for (const u of users) {
      await run('INSERT INTO users (id, userid, password, name, shortName, role, email, avatar, joinDate) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', u);
    }
    console.log('✅ Populated default users in SQLite');
  }

  // Populate Initial Expenses if empty
  const expCount = await get('SELECT COUNT(*) as count FROM expenses');
  if (expCount.count === 0) {
    const all4 = JSON.stringify(['192472374', '192472343', '192411184', '192411185']);
    const sampleExpenses = [
      ['exp1', 'Chicken Curry', 'Lunch - Chicken curry for the team', 320, '192472374', 'Jagan', all4, 'Lunch', '2026-07-01', 'Restaurant - Spice Garden', 'active', '2026-07-01T12:00:00Z', '2026-07-01T12:00:00Z'],
      ['exp2', 'Mutton Biryani', 'Dinner - Mutton biryani special', 560, '192472343', 'Sagar', all4, 'Dinner', '2026-07-03', 'Ordered from Biryani House', 'active', '2026-07-03T19:30:00Z', '2026-07-03T19:30:00Z'],
      ['exp3', 'Veg Curry + Rice', 'Lunch - Veg curry and rice', 240, '192411184', 'Prathap', all4, 'Lunch', '2026-07-05', 'Canteen lunch', 'active', '2026-07-05T13:00:00Z', '2026-07-05T13:00:00Z'],
      ['exp4', 'Fish Curry', 'Dinner - Fresh fish curry', 480, '192411185', 'Bharath', all4, 'Dinner', '2026-07-07', 'Fish market purchase', 'active', '2026-07-07T20:00:00Z', '2026-07-07T20:00:00Z'],
      ['exp5', 'Dal Tadka + Roti', 'Lunch - Dal tadka with rotis', 180, '192472374', 'Jagan', all4, 'Lunch', '2026-07-10', 'Home cooked', 'active', '2026-07-10T13:30:00Z', '2026-07-10T13:30:00Z'],
      ['exp6', 'Paneer Butter Masala', 'Special dinner', 420, '192472343', 'Sagar', all4, 'Dinner', '2026-07-12', 'Weekend treat', 'active', '2026-07-12T20:30:00Z', '2026-07-12T20:30:00Z'],
      ['exp7', 'Egg Curry', 'Breakfast - Egg curry', 160, '192411184', 'Prathap', all4, 'Breakfast', '2026-07-14', 'Morning meal', 'active', '2026-07-14T08:00:00Z', '2026-07-14T08:00:00Z'],
      ['exp8', 'Prawn Masala', 'Special - Prawn masala curry', 640, '192411185', 'Bharath', all4, 'Dinner', '2026-07-16', 'Celebration dinner', 'active', '2026-07-16T20:00:00Z', '2026-07-16T20:00:00Z'],
      ['exp9', 'Mixed Veg Curry', 'Lunch - Mixed veg curry', 200, '192472374', 'Jagan', all4, 'Lunch', '2026-07-18', 'Healthy lunch', 'active', '2026-07-18T13:00:00Z', '2026-07-18T13:00:00Z'],
      ['exp10', 'Chicken Tikka Masala', 'Dinner - Tikka masala', 500, '192472343', 'Sagar', all4, 'Dinner', '2026-07-20', 'Curry Corner', 'active', '2026-07-20T19:00:00Z', '2026-07-20T19:00:00Z'],
      ['exp11', 'Rajma Chawal', 'Lunch - Rajma rice', 220, '192411184', 'Prathap', all4, 'Lunch', '2026-07-22', 'Home cooked', 'active', '2026-07-22T13:00:00Z', '2026-07-22T13:00:00Z'],
      ['exp12', 'Lamb Rogan Josh', 'Special dinner', 720, '192411185', 'Bharath', all4, 'Dinner', '2026-07-24', 'Kashmir Kitchen', 'active', '2026-07-24T20:30:00Z', '2026-07-24T20:30:00Z'],
      ['exp13', 'Sambar + Idli', 'Breakfast - South Indian', 140, '192472374', 'Jagan', all4, 'Breakfast', '2026-07-26', 'Morning breakfast', 'active', '2026-07-26T08:00:00Z', '2026-07-26T08:00:00Z']
    ];
    for (const e of sampleExpenses) {
      await run(`INSERT INTO expenses (id, title, description, amount, paidBy, paidByName, splitBetween, category, date, notes, status, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, e);
    }
    console.log('✅ Populated default expenses in SQLite');
  }
}

module.exports = { db, run, all, get, initDatabase };
