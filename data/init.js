/**
 * Data Initialization - Creates default JSON data files
 */

const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const dataDir = path.join(__dirname);

function writeJSON(filename, data) {
  const filePath = path.join(dataDir, filename);
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    console.log(`  ✅ Created: data/${filename}`);
  }
}

function initializeData() {
  console.log('  📂 Initializing data files...');

  // Users with bcrypt hashed passwords
  const salt = bcrypt.genSaltSync(10);
  const users = [
    {
      id: '1',
      userid: '192472374',
      password: bcrypt.hashSync('kandukurijagan@14062020', salt),
      name: 'Jagan Kandukuri',
      shortName: 'Jagan',
      role: 'admin',
      email: 'jagan@curry.local',
      avatar: 'JK',
      joinDate: '2024-01-01'
    },
    {
      id: '2',
      userid: '192472343',
      password: bcrypt.hashSync('nallamalasagar', salt),
      name: 'Sagar Nallamala',
      shortName: 'Sagar',
      role: 'member',
      email: 'sagar@curry.local',
      avatar: 'SN',
      joinDate: '2024-01-01'
    },
    {
      id: '3',
      userid: '192411184',
      password: bcrypt.hashSync('prathap', salt),
      name: 'Prathap Kumar',
      shortName: 'Prathap',
      role: 'member',
      email: 'prathap@curry.local',
      avatar: 'PK',
      joinDate: '2024-01-01'
    },
    {
      id: '4',
      userid: '192411185',
      password: bcrypt.hashSync('bharath', salt),
      name: 'Bharath Reddy',
      shortName: 'Bharath',
      role: 'member',
      email: 'bharath@curry.local',
      avatar: 'BR',
      joinDate: '2024-01-01'
    }
  ];
  writeJSON('users.json', users);

  // Sample expenses
  const expenses = [
    { id: 'exp1', title: 'Chicken Curry', description: 'Lunch - Chicken curry for the team', amount: 320, paidBy: '192472374', paidByName: 'Jagan', category: 'Lunch', date: '2026-07-01', notes: 'Restaurant - Spice Garden', status: 'active', createdAt: '2026-07-01T12:00:00Z' },
    { id: 'exp2', title: 'Mutton Biryani', description: 'Dinner - Mutton biryani special', amount: 560, paidBy: '192472343', paidByName: 'Sagar', category: 'Dinner', date: '2026-07-03', notes: 'Ordered from Biryani House', status: 'active', createdAt: '2026-07-03T19:30:00Z' },
    { id: 'exp3', title: 'Veg Curry + Rice', description: 'Lunch - Veg curry and rice', amount: 240, paidBy: '192411184', paidByName: 'Prathap', category: 'Lunch', date: '2026-07-05', notes: 'Canteen lunch', status: 'active', createdAt: '2026-07-05T13:00:00Z' },
    { id: 'exp4', title: 'Fish Curry', description: 'Dinner - Fresh fish curry', amount: 480, paidBy: '192411185', paidByName: 'Bharath', category: 'Dinner', date: '2026-07-07', notes: 'Fish market purchase + cooking', status: 'active', createdAt: '2026-07-07T20:00:00Z' },
    { id: 'exp5', title: 'Dal Tadka + Roti', description: 'Lunch - Dal tadka with rotis', amount: 180, paidBy: '192472374', paidByName: 'Jagan', category: 'Lunch', date: '2026-07-10', notes: 'Home cooked', status: 'active', createdAt: '2026-07-10T13:30:00Z' },
    { id: 'exp6', title: 'Paneer Butter Masala', description: 'Special dinner - Paneer butter masala', amount: 420, paidBy: '192472343', paidByName: 'Sagar', category: 'Dinner', date: '2026-07-12', notes: 'Weekend treat', status: 'active', createdAt: '2026-07-12T20:30:00Z' },
    { id: 'exp7', title: 'Egg Curry', description: 'Breakfast - Egg curry with bread', amount: 160, paidBy: '192411184', paidByName: 'Prathap', category: 'Breakfast', date: '2026-07-14', notes: 'Morning meal', status: 'active', createdAt: '2026-07-14T08:00:00Z' },
    { id: 'exp8', title: 'Prawn Masala', description: 'Special - Prawn masala curry', amount: 640, paidBy: '192411185', paidByName: 'Bharath', category: 'Dinner', date: '2026-07-16', notes: 'Celebration dinner', status: 'active', createdAt: '2026-07-16T20:00:00Z' },
    { id: 'exp9', title: 'Mixed Veg Curry', description: 'Lunch - Mixed vegetables curry', amount: 200, paidBy: '192472374', paidByName: 'Jagan', category: 'Lunch', date: '2026-07-18', notes: 'Healthy lunch', status: 'active', createdAt: '2026-07-18T13:00:00Z' },
    { id: 'exp10', title: 'Chicken Tikka Masala', description: 'Dinner - Chicken tikka masala', amount: 500, paidBy: '192472343', paidByName: 'Sagar', category: 'Dinner', date: '2026-07-20', notes: 'Restaurant - Curry Corner', status: 'active', createdAt: '2026-07-20T19:00:00Z' },
    { id: 'exp11', title: 'Rajma Chawal', description: 'Lunch - Rajma with rice', amount: 220, paidBy: '192411184', paidByName: 'Prathap', category: 'Lunch', date: '2026-07-22', notes: 'Home cooked', status: 'active', createdAt: '2026-07-22T13:00:00Z' },
    { id: 'exp12', title: 'Lamb Rogan Josh', description: 'Special dinner - Lamb rogan josh', amount: 720, paidBy: '192411185', paidByName: 'Bharath', category: 'Dinner', date: '2026-07-24', notes: 'Ordered from Kashmir Kitchen', status: 'active', createdAt: '2026-07-24T20:30:00Z' },
    { id: 'exp13', title: 'Sambar + Idli', description: 'Breakfast - South Indian special', amount: 140, paidBy: '192472374', paidByName: 'Jagan', category: 'Breakfast', date: '2026-07-26', notes: 'Morning breakfast', status: 'active', createdAt: '2026-07-26T08:00:00Z' }
  ];
  writeJSON('expenses.json', expenses);

  // Calculate contributions per member
  const payments = [
    { id: 'pay1', memberId: '192472374', memberName: 'Jagan', amount: 1260, paidAmount: 1260, status: 'paid', lastPaymentDate: '2026-07-26', notes: 'All settled' },
    { id: 'pay2', memberId: '192472343', memberName: 'Sagar', amount: 1480, paidAmount: 1000, status: 'partial', lastPaymentDate: '2026-07-20', notes: 'Partial payment' },
    { id: 'pay3', memberId: '192411184', memberName: 'Prathap', amount: 620, paidAmount: 620, status: 'paid', lastPaymentDate: '2026-07-22', notes: 'All settled' },
    { id: 'pay4', memberId: '192411185', memberName: 'Bharath', amount: 1840, paidAmount: 500, status: 'pending', lastPaymentDate: '2026-07-16', notes: 'Pending payment' }
  ];
  writeJSON('payments.json', payments);

  // Notifications
  const notifications = [
    { id: 'n1', type: 'expense', message: 'New expense added: Sambar + Idli (₹140)', timestamp: '2026-07-26T08:00:00Z', read: false, forRole: 'admin' },
    { id: 'n2', type: 'payment', message: 'Bharath has a pending payment of ₹1,340', timestamp: '2026-07-25T10:00:00Z', read: false, forRole: 'admin' },
    { id: 'n3', type: 'payment', message: 'Sagar has a partial payment pending of ₹480', timestamp: '2026-07-24T09:00:00Z', read: false, forRole: 'admin' },
    { id: 'n4', type: 'expense', message: 'New expense added: Lamb Rogan Josh (₹720)', timestamp: '2026-07-24T20:30:00Z', read: true, forRole: 'admin' }
  ];
  writeJSON('notifications.json', notifications);

  console.log('  ✅ Data initialization complete!');
}

module.exports = { initializeData };
