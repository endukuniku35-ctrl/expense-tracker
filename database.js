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

const dbCache = {};

function getFilePath(table) {
  return path.join(dataDir, `${table}.json`);
}

function readData(table) {
  if (dbCache[table]) return dbCache[table];
  const filePath = getFilePath(table);
  if (!fs.existsSync(filePath)) {
    dbCache[table] = [];
    return [];
  }
  try {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    dbCache[table] = data;
    return data;
  } catch (e) {
    dbCache[table] = [];
    return [];
  }
}

function writeData(table, data) {
  dbCache[table] = data;
  const filePath = getFilePath(table);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

// ─── Query Emulators ───────────────────────────────

async function all(tableOrSql) {
  if (tableOrSql.includes('expenses')) return readData('expenses');
  if (tableOrSql.includes('settlements')) return readData('settlements');
  if (tableOrSql.includes('notifications')) return readData('notifications');
  if (tableOrSql.includes('messages')) return readData('messages');
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

  // Messages INSERT
  if (sql.includes('INSERT INTO messages')) {
    const messages = readData('messages');
    messages.push({
      id: params[0],
      senderId: params[1],
      senderName: params[2],
      senderAvatar: params[3],
      senderRole: params[4],
      text: params[5],
      timestamp: params[6],
      isNudge: params[7] ? true : false
    });
    writeData('messages', messages.slice(-100)); // keep last 100 messages
    return;
  }

  // Users INSERT
  if (sql.includes('INSERT INTO users')) {
    const users = readData('users');
    const newUser = {
      id: params[0],
      userid: params[1],
      password: params[2],
      rawPassword: params[9] || 'Set by Admin',
      name: params[3],
      shortName: params[4],
      role: params[5] || 'member',
      email: params[6] || `${params[1]}@curry.local`,
      avatar: params[7] || params[4].substring(0, 2).toUpperCase(),
      joinDate: params[8] || new Date().toISOString().split('T')[0],
      createdBy: params[10] || '192472374',
      createdByName: params[11] || 'Jagan (Main Admin)'
    };
    users.push(newUser);
    writeData('users', users);
    return;
  }

  // Users DELETE
  if (sql.includes('DELETE FROM users')) {
    let users = readData('users');
    users = users.filter(u => u.userid !== params[0] && u.id !== params[0]);
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
  let users = readData('users');
  const salt = bcrypt.genSaltSync(10);

  const defaultUsersList = [
    { id: '1', userid: '192472374', password: bcrypt.hashSync('kandukurijagan@14062020', salt), rawPassword: 'kandukurijagan@14062020', name: 'Jagan Kandukuri', shortName: 'Jagan', role: 'super_admin', email: 'jagan@curry.local', avatar: 'JK', joinDate: '2024-01-01', createdBy: '192472374', createdByName: 'System' },
    { id: '2', userid: '192472343', password: bcrypt.hashSync('nallamalasagar', salt), rawPassword: 'nallamalasagar', name: 'Sagar Nallamala', shortName: 'Sagar', role: 'member', email: 'sagar@curry.local', avatar: 'SN', joinDate: '2024-01-01', createdBy: '192472374', createdByName: 'Jagan (Main Admin)' },
    { id: '3', userid: '192411184', password: bcrypt.hashSync('prathap', salt), rawPassword: 'prathap', name: 'Prathap Kumar', shortName: 'Prathap', role: 'member', email: 'prathap@curry.local', avatar: 'PK', joinDate: '2024-01-01', createdBy: '192472374', createdByName: 'Jagan (Main Admin)' },
    { id: '4', userid: '192411185', password: bcrypt.hashSync('bharath', salt), rawPassword: 'bharath', name: 'Bharath Reddy', shortName: 'Bharath', role: 'member', email: 'bharath@curry.local', avatar: 'BR', joinDate: '2024-01-01', createdBy: '192472374', createdByName: 'Jagan (Main Admin)' },
    { id: '5', userid: '192412348', password: bcrypt.hashSync('charan', salt), rawPassword: 'charan', name: 'Charan', shortName: 'Charan', role: 'member', email: '192412348@curry.local', avatar: 'CH', joinDate: '2026-07-26', createdBy: '192472374', createdByName: 'Jagan (Main Admin)' },
    { id: '6', userid: 'Ganesh', password: bcrypt.hashSync('ganesh', salt), rawPassword: 'ganesh', name: 'Ganesh', shortName: 'Ganesh', role: 'member', email: 'Ganesh@curry.local', avatar: 'GA', joinDate: '2026-07-26', createdBy: '192472374', createdByName: 'Jagan (Main Admin)' },
    { id: '7', userid: '192472066', password: bcrypt.hashSync('anudeep', salt), rawPassword: 'anudeep', name: 'anudeep', shortName: 'anudeep', role: 'admin', email: 'anudeep@curry.local', avatar: 'AN', joinDate: '2026-07-26', createdBy: '192472374', createdByName: 'Jagan (Main Admin)' },
    { id: '8', userid: 'anudeep', password: bcrypt.hashSync('anudeep', salt), rawPassword: 'anudeep', name: 'anudeep', shortName: 'anudeep', role: 'admin', email: 'anudeep@curry.local', avatar: 'AN', joinDate: '2026-07-26', createdBy: '192472374', createdByName: 'Jagan (Main Admin)' },
    { id: '9', userid: 'a', password: bcrypt.hashSync('a', salt), rawPassword: 'a', name: 'a', shortName: 'a', role: 'member', email: 'a@curry.local', avatar: 'A', joinDate: '2026-07-27', createdBy: '192472066', createdByName: 'anudeep' }
  ];

  let updated = false;
  defaultUsersList.forEach(defUser => {
    const existing = users.find(u => u.userid === defUser.userid);
    if (!existing) {
      users.push(defUser);
      updated = true;
    } else if (!existing.rawPassword) {
      existing.rawPassword = defUser.rawPassword;
      updated = true;
    }
  });

  if (updated) {
    writeData('users', users);
    console.log('  ✅ Merged default members in users.json');
  }

  // Check expenses
  if (!fs.existsSync(getFilePath('expenses'))) {
    writeData('expenses', []);
  }

  // Check settlements
  if (!fs.existsSync(getFilePath('settlements'))) {
    writeData('settlements', []);
  }

  // Check notifications
  if (!fs.existsSync(getFilePath('notifications'))) {
    writeData('notifications', []);
  }
}

module.exports = { all, get, run, initDatabase };
