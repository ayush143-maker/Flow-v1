import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'vite';

let server;
let generateInsights;
before(async () => {
  server = await createServer({ configFile: 'vite.config.ts', server: { middlewareMode: true }, appType: 'custom' });
  ({ generateInsights } = await server.ssrLoadModule('/src/services/analytics/insights.ts'));
});
after(async () => { await server?.close(); });

function tx(day, month, overrides = {}) {
  const date = new Date(2024, month, day, 12).toISOString();
  return {
    id: String(month) + '-' + String(day) + '-' + String(overrides.type || 'debit'),
    amountMinor: 10000, currency: 'INR', merchant: 'Cafe',
    merchantNormalized: 'CAFE', category: 'Food', type: 'debit',
    source: 'manual', paymentMethod: null, accountHint: null,
    transactionDate: date, createdAt: date, originalMessage: null,
    messageHash: 'hash', referenceId: null, isTestData: false, metadata: null,
    ...overrides,
  };
}

test('returns no insights when there are no transactions', () => {
  assert.deepEqual(generateInsights([], new Date(2024, 1, 15)), []);
});
test('does not create spending insights from credits alone', () => {
  const rows = [tx(5, 1, { type: 'credit', category: 'Salary' })];
  assert.deepEqual(generateInsights(rows, new Date(2024, 1, 15)), []);
});
test('reports the largest debit in the current month', () => {
  const rows = [tx(5, 1, { amountMinor: 88000, merchant: 'Laptop Shop', category: 'Shopping' })];
  const insights = generateInsights(rows, new Date(2024, 1, 15));
  assert.ok(insights.some((x) => x.id === 'largest' && x.title.includes('Laptop Shop')));
});
test('reports one subscription charge with singular grammar', () => {
  const insights = generateInsights([tx(5, 1, { category: 'Subscriptions', amountMinor: 30000 })], new Date(2024, 1, 15));
  const item = insights.find((x) => x.id === 'subs');
  assert.ok(item);
  assert.ok(item.detail.includes('1 subscription charge so far'));
});
test('reports multiple subscription charges with plural grammar', () => {
  const rows = [tx(5, 1, { category: 'Subscriptions', amountMinor: 30000 }), tx(7, 1, { category: 'Subscriptions', amountMinor: 20000 })];
  const item = generateInsights(rows, new Date(2024, 1, 15)).find((x) => x.id === 'subs');
  assert.ok(item);
  assert.ok(item.detail.includes('2 subscription charges so far'));
});
test('reports the largest food merchant', () => {
  const rows = [tx(5, 1, { merchant: 'Cafe North', merchantNormalized: 'CAFE NORTH', amountMinor: 30000 }), tx(6, 1, { merchant: 'Cafe North', merchantNormalized: 'CAFE NORTH', amountMinor: 20000 })];
  const item = generateInsights(rows, new Date(2024, 1, 15)).find((x) => x.id === 'food-top');
  assert.ok(item);
  assert.ok(item.title.includes('Cafe North'));
});
test('reports cash-category spending', () => {
  const item = generateInsights([tx(5, 1, { category: 'Cash', amountMinor: 25000 })], new Date(2024, 1, 15)).find((x) => x.id === 'cash');
  assert.ok(item);
  assert.ok(item.title.includes('cash this month'));
});
test('warns when a leading category increases past the configured threshold', () => {
  const rows = [tx(5, 1, { category: 'Food', amountMinor: 100000 }), tx(5, 0, { category: 'Food', amountMinor: 50000 })];
  assert.ok(generateInsights(rows, new Date(2024, 1, 15)).some((x) => x.id === 'cat-up'));
});
test('reports a leading category decrease versus the previous month', () => {
  const rows = [tx(5, 1, { category: 'Food', amountMinor: 40000 }), tx(5, 0, { category: 'Food', amountMinor: 100000 })];
  assert.ok(generateInsights(rows, new Date(2024, 1, 15)).some((x) => x.id === 'cat-down'));
});
test('limits the insight list to five entries', () => {
  const rows = [
    tx(5, 1, { category: 'Food', amountMinor: 100000, merchant: 'Food Shop', merchantNormalized: 'FOOD SHOP' }),
    tx(6, 1, { category: 'Food', amountMinor: 50000, merchant: 'Food Shop', merchantNormalized: 'FOOD SHOP' }),
    tx(7, 1, { category: 'Subscriptions', amountMinor: 50000 }),
    tx(8, 1, { category: 'Cash', amountMinor: 50000 }),
    tx(5, 0, { category: 'Food', amountMinor: 50000 }),
  ];
  assert.equal(generateInsights(rows, new Date(2024, 1, 15)).length, 5);
});

test("does not report subscriptions when no subscription debit exists", () => {
  const rows = [tx(5, 1, { category: 'Food' })];
  assert.equal(generateInsights(rows, new Date(2024, 1, 15)).some((x) => x.id === 'subs'), false);
});
