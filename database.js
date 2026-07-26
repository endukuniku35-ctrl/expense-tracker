/**
 * database.js – Pure JavaScript Data Storage Engine
 * 100% portable across all Node.js platforms (Render, Linux, Windows, macOS).
 * Zero C++ native dependencies & zero GLIBC errors.
 */

const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

function getFilePath(table) {
  return path.join(dataDir, `${table}.json`);
}

function readData(table) {
  const filePath = getFilePath(table);
  if (!fs.existsSync(filePath)) return [];
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (e) {
    return [];
  }
}

function writeData(table, data) {
  const filePath = getFilePath(table);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

// ─── Query Emulators ───────────────────────────────

async function all(tableOrSql) {
  if (tableOrSql.includes('expenses')) return readData('expenses');
  if (tableOrSql.includes('settlements')) return readData('settlements');
  if (tableOrSql.includes('notifications')) return readData('notifications');
  if (tableOrSql.includes('users')) return readData('users');
  return [];
}

async function get(sql, params = []) {
  if (sql.includes('FROM users WHERE userid')) {
    const users = readData('users');
    return users.find(u => u.userid === params[0]) || null;
  }
  if (sql.includes('SELECT shortName FROM users WHERE userid')) {
    const users = readData('users');
    const u = users.find(x => x.userid === params[0]);
    return u ? { shortName: u.shortName } : null;
  }
  if (sql.includes('FROM expenses WHERE id')) {
    const expenses = readData('expenses');
    return expenses.find(e => e.id === params[0]) || null;
  }
  if (sql.includes('FROM settlements WHERE id')) {
    const settlements = readData('settlements');
    return settlements.find(s => s.id === params[0]) || null;
  }
  if (sql.includes('COUNT(*)')) {
    let table = 'expenses';
    if (sql.includes('users')) table = 'users';
    const items = readData(table);
    return { count: items.length };
  }
  return null;
}

async function run(sql, params = []) {
  // Expenses INSERT
  if (sql.includes('INSERT INTO expenses')) {
    const expenses = readData('expenses');
    const newExp = {
      id: params[0],
      title: params[1],
      description: params[2],
      amount: parseFloat(params[3]),
      paidBy: params[4],
      paidByName: params[5],
      splitBetween: typeof params[6] === 'string' ? JSON.parse(params[6]) : params[6],
      category: params[7],
      date: params[8],
      notes: params[9],
      status: params[10] || 'active',
      createdAt: params[11],
      updatedAt: params[12]
    };
    expenses.unshift(newExp);
    writeData('expenses', expenses);
    return;
  }

  // Expenses UPDATE
  if (sql.includes('UPDATE expenses')) {
    const expenses = readData('expenses');
    const id = params[10];
    const idx = expenses.findIndex(e => e.id === id);
    if (idx !== -1) {
      expenses[idx] = {
        ...expenses[idx],
        title: params[0],
        description: params[1],
        amount: parseFloat(params[2]),
        paidBy: params[3],
        paidByName: params[4],
        splitBetween: typeof params[5] === 'string' ? JSON.parse(params[5]) : params[5],
        category: params[6],
        date: params[7],
        notes: params[8],
        updatedAt: params[9]
      };
      writeData('expenses', expenses);
    }
    return;
  }

  // Expenses DELETE
  if (sql.includes('DELETE FROM expenses')) {
    let expenses = readData('expenses');
    expenses = expenses.filter(e => e.id !== params[0]);
    writeData('expenses', expenses);
    return;
  }

  // Settlements INSERT
  if (sql.includes('INSERT INTO settlements')) {
    const settlements = readData('settlements');
    const newSet = {
      id: params[0],
      fromMemberId: params[1],
      fromMemberName: params[2],
      toMemberId: params[3],
      toMemberName: params[4],
      amount: parseFloat(params[5]),
      notes: params[6],
      date: params[7],
      createdAt: params[8]
    };
    settlements.unshift(newSet);
    writeData('settlements', settlements);
    return;
  }

  // Settlements DELETE
  if (sql.includes('DELETE FROM settlements')) {
    let settlements = readData('settlements');
    settlements = settlements.filter(s => s.id !== params[0]);
    writeData('settlements', settlements);
    return;
  }

  // Notifications INSERT
  if (sql.includes('INSERT INTO notifications')) {
    const notifications = readData('notifications');
    notifications.unshift({
      id: params[0],
      type: params[1],
      message: params[2],
      timestamp: params[3],
      read: false,
      forRole: params[4] || 'admin'
    });
    writeData('notifications', notifications.slice(0, 50));
    return;
  }

  // Users INSERT
  if (sql.includes('INSERT INTO users')) {
    const users = readData('users');
    const newUser = {
      id: params[0],
      userid: params[1],
      password: params[2],
      name: params[3],
      shortName: params[4],
      role: params[5] || 'member',
      email: params[6] || `${params[1]}@curry.local`,
      avatar: params[7] || params[4].substring(0, 2).toUpperCase(),
      joinDate: params[8] || new Date().toISOString().split('T')[0]
    };
    users.push(newUser);
    writeData('users', users);
    return;
  }

  // Notifications UPDATE (mark read)
  if (sql.includes('UPDATE notifications SET read = 1 WHERE id')) {
    const notifications = readData('notifications');
    const n = notifications.find(x => x.id === params[0]);
    if (n) n.read = true;
    writeData('notifications', notifications);
    return;
  }

  if (sql.includes('UPDATE notifications SET read = 1')) {
    const notifications = readData('notifications');
    notifications.forEach(n => n.read = true);
    writeData('notifications', notifications);
    return;
  }
}

async function initDatabase() {
  // Check users
  const users = readData('users');
  if (users.length === 0) {
    const salt = bcrypt.genSaltSync(10);
    const defaultUsers = [
      { id: '1', userid: '192472374', password: bcrypt.hashSync('kandukurijagan@14062020', salt), name: 'Jagan Kandukuri', shortName: 'Jagan', role: 'admin', email: 'jagan@curry.local', avatar: 'JK', joinDate: '2024-01-01' },
      { id: '2', userid: '192472343', password: bcrypt.hashSync('nallamalasagar', salt), name: 'Sagar Nallamala', shortName: 'Sagar', role: 'member', email: 'sagar@curry.local', avatar: 'SN', joinDate: '2024-01-01' },
      { id: '3', userid: '192411184', password: bcrypt.hashSync('prathap', salt), name: 'Prathap Kumar', shortName: 'Prathap', role: 'member', email: 'prathap@curry.local', avatar: 'PK', joinDate: '2024-01-01' },
      { id: '4', userid: '192411185', password: bcrypt.hashSync('bharath', salt), name: 'Bharath Reddy', shortName: 'Bharath', role: 'member', email: 'bharath@curry.local', avatar: 'BR', joinDate: '2024-01-01' }
    ];
    writeData('users', defaultUsers);
    console.log('  ✅ Initialized default users');
  }

  // Check expenses
  const expenses = readData('expenses');
  if (expenses.length === 0) {
    const all4 = ['192472374', '192472343', '192411184', '192411185'];
    const sampleExpenses = [
      { id: 'exp1', title: 'Chicken Curry', description: 'Lunch - Chicken curry for the team', amount: 320, paidBy: '192472374', paidByName: 'Jagan', splitBetween: all4, category: 'Lunch', date: '2026-07-01', notes: 'Restaurant - Spice Garden', status: 'active', createdAt: '2026-07-01T12:00:00Z', updatedAt: '2026-07-01T12:00:00Z' },
      { id: 'exp2', title: 'Mutton Biryani', description: 'Dinner - Mutton biryani special', amount: 560, paidBy: '192472343', paidByName: 'Sagar', splitBetween: all4, category: 'Dinner', date: '2026-07-03', notes: 'Ordered from Biryani House', status: 'active', createdAt: '2026-07-03T19:30:00Z', updatedAt: '2026-07-03T19:30:00Z' },
      { id: 'exp3', title: 'Veg Curry + Rice', description: 'Lunch - Veg curry and rice', amount: 240, paidBy: '192411184', paidByName: 'Prathap', splitBetween: all4, category: 'Lunch', date: '2026-07-05', notes: 'Canteen lunch', status: 'active', createdAt: '2026-07-05T13:00:00Z', updatedAt: '2026-07-05T13:00:00Z' },
      { id: 'exp4', title: 'Fish Curry', description: 'Dinner - Fresh fish curry', amount: 480, paidBy: '192411185', paidByName: 'Bharath', splitBetween: all4, category: 'Dinner', date: '2026-07-07', notes: 'Fish market purchase', status: 'active', createdAt: '2026-07-07T20:00:00Z', updatedAt: '2026-07-07T20:00:00Z' },
      { id: 'exp5', title: 'Dal Tadka + Roti', description: 'Lunch - Dal tadka with rotis', amount: 180, paidBy: '192472374', paidByName: 'Jagan', splitBetween: all4, category: 'Lunch', date: '2026-07-10', notes: 'Home cooked', status: 'active', createdAt: '2026-07-10T13:30:00Z', updatedAt: '2026-07-10T13:30:00Z' },
      { id: 'exp6', title: 'Paneer Butter Masala', description: 'Special dinner', amount: 420, paidBy: '192472343', paidByName: 'Sagar', splitBetween: all4, category: 'Dinner', date: '2026-07-12', notes: 'Weekend treat', status: 'active', createdAt: '2026-07-12T20:30:00Z', updatedAt: '2026-07-12T20:30:00Z' },
      { id: 'exp7', title: 'Egg Curry', description: 'Breakfast - Egg curry', amount: 160, paidBy: '192411184', paidByName: 'Prathap', splitBetween: all4, category: 'Breakfast', date: '2026-07-14', notes: 'Morning meal', status: 'active', createdAt: '2026-07-14T08:00:00Z', updatedAt: '2026-07-14T08:00:00Z' },
      { id: 'exp8', title: 'Prawn Masala', description: 'Special - Prawn masala curry', amount: 640, paidBy: '192411185', paidByName: 'Bharath', splitBetween: all4, category: 'Dinner', date: '2026-07-16', notes: 'Celebration dinner', status: 'active', createdAt: '2026-07-16T20:00:00Z', updatedAt: '2026-07-16T20:00:00Z' },
      { id: 'exp9', title: 'Mixed Veg Curry', description: 'Lunch - Mixed veg curry', amount: 200, paidBy: '192472374', paidByName: 'Jagan', splitBetween: all4, category: 'Lunch', date: '2026-07-18', notes: 'Healthy lunch', status: 'active', createdAt: '2026-07-18T13:00:00Z', updatedAt: '2026-07-18T13:00:00Z' },
      { id: 'exp10', title: 'Chicken Tikka Masala', description: 'Dinner - Tikka masala', amount: 500, paidBy: '192472343', paidByName: 'Sagar', splitBetween: all4, category: 'Dinner', date: '2026-07-20', notes: 'Curry Corner', status: 'active', createdAt: '2026-07-20T19:00:00Z', updatedAt: '2026-07-20T19:00:00Z' },
      { id: 'exp11', title: 'Rajma Chawal', description: 'Lunch - Rajma rice', amount: 220, paidBy: '192411184', paidByName: 'Prathap', splitBetween: all4, category: 'Lunch', date: '2026-07-22', notes: 'Home cooked', status: 'active', createdAt: '2026-07-22T13:00:00Z', updatedAt: '2026-07-22T13:00:00Z' },
      { id: 'exp12', title: 'Lamb Rogan Josh', description: 'Special dinner', amount: 720, paidBy: '192411185', paidByName: 'Bharath', splitBetween: all4, category: 'Dinner', date: '2026-07-24', notes: 'Kashmir Kitchen', status: 'active', createdAt: '2026-07-24T20:30:00Z', updatedAt: '2026-07-24T20:30:00Z' },
      { id: 'exp13', title: 'Sambar + Idli', description: 'Breakfast - South Indian', amount: 140, paidBy: '192472374', paidByName: 'Jagan', splitBetween: all4, category: 'Breakfast', date: '2026-07-26', notes: 'Morning breakfast', status: 'active', createdAt: '2026-07-26T08:00:00Z', updatedAt: '2026-07-26T08:00:00Z' }
    ];
    writeData('expenses', sampleExpenses);
    console.log('  ✅ Initialized default expenses');
  }

  // Check settlements
  const settlements = readData('settlements');
  if (!fs.existsSync(getFilePath('settlements'))) {
    writeData('settlements', []);
  }

  // Check notifications
  if (!fs.existsSync(getFilePath('notifications'))) {
    writeData('notifications', []);
  }
}

module.exports = { all, get, run, initDatabase };
