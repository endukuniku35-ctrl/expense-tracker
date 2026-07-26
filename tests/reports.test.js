const test = require('node:test');
const assert = require('node:assert/strict');

const reportsModule = require('../routes/reports');

test('reports module loads without syntax errors', () => {
  assert.ok(reportsModule);
});
