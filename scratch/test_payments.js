const fs = require('fs');
const path = require('path');

// Mock DOM & App
global.window = global;
global.document = {
  getElementById: (id) => ({
    innerHTML: '',
    style: {},
    classList: { add: () => {}, remove: () => {} },
    options: [],
    selectedIndex: 0,
    value: ''
  }),
  querySelectorAll: () => []
};

global.App = {
  isAdmin: true,
  currentUser: { userid: '192472374', name: 'Jagan' }
};

global.api = async (url) => {
  if (url === '/api/balance') {
    return {
      success: true,
      balances: [
        { userid: '192472374', name: 'Jagan', shortName: 'Jagan', avatar: 'JK', role: 'admin', totalPaid: 570, totalShare: 142.5, netBalance: 427.5, outstanding: 427.5, expenseCount: 1, mealsCount: 1, settledIn: 0, settledOut: 0 }
      ],
      totalExpenses: 570,
      perPersonShare: 142.5,
      settlements: []
    };
  }
  if (url === '/api/expenses/all') {
    return { success: true, data: [] };
  }
  return null;
};

global.formatDate = (d) => d;
global.avatarClass = (n) => 'avatar-jagan';
global.animateCounter = () => {};

try {
  const code = fs.readFileSync(path.join(__dirname, '../public/js/payments.js'), 'utf8');
  eval(code);
  console.log('Evaluated payments.js successfully!');
  loadPayments().then(() => {
    console.log('loadPayments() executed cleanly without throwing errors!');
  }).catch(err => {
    console.error('loadPayments() promise rejected:', err);
  });
} catch (e) {
  console.error('Eval error in payments.js:', e);
}
