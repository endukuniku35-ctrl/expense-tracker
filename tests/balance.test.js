const test = require('node:test');
const assert = require('node:assert/strict');

const balanceModule = require('../routes/balance');

test('balance module exports its router and member list', () => {
  assert.ok(balanceModule.router);
  assert.equal(typeof balanceModule.computeBalances, 'function');
  assert.ok(Array.isArray(balanceModule.MEMBERS));
  assert.equal(balanceModule.MEMBERS.length, 4);
});
