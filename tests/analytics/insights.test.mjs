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

test("uses the same month-to-date cutoff for insight comparisons", () => {
  const rows = [tx(20, 1, { category: 'Food', amountMinor: 100000 }), tx(5, 0, { category: 'Food', amountMinor: 50000 })];
  assert.equal(generateInsights(rows, new Date(2024, 1, 15)).some((x) => x.id === 'largest' && x.title.includes('₹1,000')), false);
});

test("does not invent a food merchant insight for travel expenses", () => {
  const rows = [tx(5, 1, { category: 'Travel', amountMinor: 25000 })];
  assert.equal(generateInsights(rows, new Date(2024, 1, 15)).some((x) => x.id === 'food-top'), false);
});

test("does not create cash insight for other categories", () => {
  const rows = [tx(5, 1, { category: 'Bills', amountMinor: 20000 })];
  assert.equal(generateInsights(rows, new Date(2024, 1, 15)).some((x) => x.id === 'cash'), false);
});

test("ignores previous-month credits in the category comparison", () => {
  const rows = [tx(5, 1, { category: 'Food', amountMinor: 100000 }), tx(5, 0, { type: 'credit', category: 'Food', amountMinor: 200000 })];
  assert.equal(generateInsights(rows, new Date(2024, 1, 15)).some((x) => x.id === 'cat-up'), false);
});

test("does not add a food insight for credit-only food records", () => {
  const rows = [tx(5, 1, { type: 'credit', category: 'Food', merchant: 'Cafe' })];
  assert.equal(generateInsights(rows, new Date(2024, 1, 15)).some((x) => x.id === 'food-top'), false);
});

test("largest spend picks the highest debit", () => {
  const rows = [tx(5, 1, { amountMinor: 1000 }), tx(6, 1, { amountMinor: 9000, merchant: 'Big Store' })];
  const item = generateInsights(rows, new Date(2024, 1, 15)).find((x) => x.id === 'largest');
  assert.ok(item.title.includes('Big Store'));
});

test("largest spend ignores a higher credit amount", () => {
  const rows = [tx(5, 1, { amountMinor: 2000 }), tx(6, 1, { type: 'credit', amountMinor: 900000, merchant: 'Salary' })];
  const item = generateInsights(rows, new Date(2024, 1, 15)).find((x) => x.id === 'largest');
  assert.ok(item.title.includes('₹20'));
  assert.equal(item.title.includes('Salary'), false);
});

test("food insight reports singular order grammar", () => {
  const rows = [tx(5, 1, { category: 'Food', amountMinor: 12000, merchant: 'Cafe Solo', merchantNormalized: 'CAFE SOLO' })];
  const item = generateInsights(rows, new Date(2024, 1, 15)).find((x) => x.id === 'food-top');
  assert.ok(item.detail.includes('1 order'));
});

test("cash insight reports singular withdrawal grammar", () => {
  const item = generateInsights([tx(5, 1, { category: 'Cash', amountMinor: 20000 })], new Date(2024, 1, 15)).find((x) => x.id === 'cash');
  assert.ok(item.detail.includes('1 ATM withdrawal'));
});

test("does not report category trend when previous category has no spending", () => {
  const rows = [tx(5, 1, { category: 'Travel', amountMinor: 100000 })];
  assert.equal(generateInsights(rows, new Date(2024, 1, 15)).some((x) => x.id === 'cat-up' || x.id === 'cat-down'), false);
});
