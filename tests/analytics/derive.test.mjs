import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'vite';

let server;
let analytics;
before(async () => {
  server = await createServer({ configFile: 'vite.config.ts', server: { middlewareMode: true }, appType: 'custom' });
  analytics = await server.ssrLoadModule('/src/services/analytics/derive.ts');
});
after(async () => { await server?.close(); });

function tx(overrides = {}) {
  return {
    id: 't1', amountMinor: 1000, currency: 'INR', merchant: 'Cafe',
    merchantNormalized: 'CAFE', category: 'Food', type: 'debit',
    source: 'manual', paymentMethod: null, accountHint: null,
    transactionDate: new Date(2024, 0, 2, 12).toISOString(),
    createdAt: new Date(2024, 0, 2, 12).toISOString(),
    originalMessage: null, messageHash: 'hash', referenceId: null,
    isTestData: false, metadata: null, ...overrides,
  };
}

test('debits filters out credit transactions', () => {
  assert.equal(analytics.debits([tx(), tx({ id: 'c', type: 'credit' })]).length, 1);
});
test('credits filters out debit transactions', () => {
  assert.equal(analytics.credits([tx(), tx({ id: 'c', type: 'credit' })]).length, 1);
});
test('range includes a transaction exactly at the start', () => {
  const from = new Date(2024, 0, 2, 12);
  const to = new Date(2024, 0, 3, 12);
  assert.equal(analytics.inRange([tx({ transactionDate: from.toISOString() })], from, to).length, 1);
});
test('range excludes a transaction exactly at the end', () => {
  const from = new Date(2024, 0, 2, 12);
  const to = new Date(2024, 0, 3, 12);
  assert.equal(analytics.inRange([tx({ transactionDate: to.toISOString() })], from, to).length, 0);
});
test('period statistics aggregate only debits within the interval', () => {
  const from = new Date(2024, 0, 1);
  const to = new Date(2024, 0, 4);
  const rows = [tx({ amountMinor: 600 }), tx({ id: 't2', amountMinor: 300, transactionDate: new Date(2024,0,3,12).toISOString() }), tx({ id: 'c', type: 'credit', amountMinor: 900 })];
  assert.deepEqual(analytics.periodStats(rows, from, to), { totalMinor: 900, count: 2, avgDailyMinor: 300, days: 3 });
});
test('empty zero-length period is protected against division by zero', () => {
  const date = new Date(2024, 0, 1);
  assert.deepEqual(analytics.periodStats([], date, date), { totalMinor: 0, count: 0, avgDailyMinor: 0, days: 1 });
});
test('category breakdown aggregates amount count and share', () => {
  const rows = [tx({ amountMinor: 300, category: 'Food' }), tx({ id: 't2', amountMinor: 100, category: 'Food' }), tx({ id: 't3', amountMinor: 100, category: 'Travel' })];
  const slices = analytics.categoryBreakdown(rows);
  assert.equal(slices[0].category, 'Food');
  assert.equal(slices[0].amountMinor, 400);
  assert.equal(slices[0].count, 2);
  assert.equal(slices[0].share, 0.8);
});
test('category breakdown excludes credit amounts', () => {
  const slices = analytics.categoryBreakdown([tx({ amountMinor: 300 }), tx({ id: 'c', type: 'credit', amountMinor: 700, category: 'Salary' })]);
  assert.equal(slices.length, 1);
  assert.equal(slices[0].amountMinor, 300);
});
test('zero-total category slices have zero share', () => {
  const slices = analytics.categoryBreakdown([tx({ amountMinor: 0 })]);
  assert.equal(slices[0].share, 0);
});
test('category breakdown sorts categories by descending amount', () => {
  const slices = analytics.categoryBreakdown([tx({ amountMinor: 100, category: 'Food' }), tx({ id: 't2', amountMinor: 500, category: 'Travel' })]);
  assert.deepEqual(slices.map((x) => x.category), ['Travel', 'Food']);
});
test('top merchants aggregates transactions sharing normalized identity', () => {
  const rows = [tx({ amountMinor: 300, merchant: 'Cafe One', merchantNormalized: 'CAFE' }), tx({ id: 't2', amountMinor: 200, merchant: 'Cafe 1', merchantNormalized: 'CAFE' })];
  const top = analytics.topMerchants(rows);
  assert.equal(top.length, 1);
  assert.equal(top[0].amountMinor, 500);
  assert.equal(top[0].count, 2);
});
test('top merchants respects a requested result limit', () => {
  const rows = [tx({ amountMinor: 500, merchantNormalized: 'A' }), tx({ id: 'b', amountMinor: 300, merchantNormalized: 'B' })];
  assert.equal(analytics.topMerchants(rows, 1).length, 1);
});
test('top merchants excludes credits', () => {
  const top = analytics.topMerchants([tx(), tx({ id: 'c', type: 'credit', merchantNormalized: 'SALARY' })]);
  assert.deepEqual(top.map((x) => x.merchantNormalized), ['CAFE']);
});
test('daily totals return an oldest-to-newest fixed-length array', () => {
  const end = new Date(2024, 0, 3, 20);
  const rows = [tx({ amountMinor: 100, transactionDate: new Date(2024,0,1,12).toISOString() }), tx({ id: 't2', amountMinor: 200, transactionDate: new Date(2024,0,3,12).toISOString() })];
  assert.deepEqual(analytics.dailyTotals(rows, 3, end), [100, 0, 200]);
});
test('daily totals ignore credits and transactions outside the window', () => {
  const rows = [tx({ amountMinor: 100 }), tx({ id: 'c', type: 'credit', amountMinor: 500 }), tx({ id: 'old', amountMinor: 800, transactionDate: new Date(2023,11,1).toISOString() })];
  assert.deepEqual(analytics.dailyTotals(rows, 3, new Date(2024,0,3,20)), [0, 1000, 0]);
});
test('month-to-date caps the prior February period at month end', () => {
  const p = analytics.monthToDate(new Date(2024, 2, 31, 12));
  assert.equal(p.from.getDate(), 1);
  assert.equal(p.from.getMonth(), 2);
  assert.equal(p.to.getMonth(), 3);
  assert.equal(p.prevFrom.getMonth(), 1);
  assert.equal(p.prevTo.getMonth(), 2);
  assert.equal(p.prevTo.getDate(), 1);
});
test('weekly period spans seven calendar days and uses adjacent previous range', () => {
  const p = analytics.periodFor('weekly', new Date(2024, 0, 10, 15));
  assert.equal(Math.round((p.to - p.from) / 86400000), 7);
  assert.equal(p.prevTo.getTime(), p.from.getTime());
  assert.equal(Math.round((p.prevTo - p.prevFrom) / 86400000), 7);
});
test('monthly trend emits six weekly buckets', () => {
  assert.equal(analytics.buckets([], 'monthly', new Date(2024, 0, 10)).length, 6);
});
test('yearly trend emits twelve monthly buckets', () => {
  assert.equal(analytics.buckets([], 'yearly', new Date(2024, 0, 10)).length, 12);
});
test('weekly trend emits seven day buckets', () => {
  assert.equal(analytics.buckets([], 'weekly', new Date(2024, 0, 10)).length, 7);
});

test("debit filter preserves relative order", () => {
  const rows = [tx({ id: 'first' }), tx({ id: 'credit', type: 'credit' }), tx({ id: 'last' })];
  assert.deepEqual(analytics.debits(rows).map((x) => x.id), ['first', 'last']);
});

test("credit filter preserves relative order", () => {
  const rows = [tx({ id: 'debit' }), tx({ id: 'credit-1', type: 'credit' }), tx({ id: 'credit-2', type: 'credit' })];
  assert.deepEqual(analytics.credits(rows).map((x) => x.id), ['credit-1', 'credit-2']);
});

test("range excludes a transaction before the start", () => {
  const from = new Date(2024, 0, 2);
  const to = new Date(2024, 0, 4);
  assert.equal(analytics.inRange([tx({ transactionDate: new Date(2024,0,1,12).toISOString() })], from, to).length, 0);
});

test("range selects no transactions from an empty input", () => {
  assert.deepEqual(analytics.inRange([], new Date(2024,0,1), new Date(2024,0,2)), []);
});

test("period statistics compute rounded daily average", () => {
  const p = analytics.periodStats([tx({ amountMinor: 100 })], new Date(2024,0,1), new Date(2024,0,4));
  assert.equal(p.avgDailyMinor, 33);
});

test("category breakdown returns an empty list for no transactions", () => {
  assert.deepEqual(analytics.categoryBreakdown([]), []);
});

test("top merchants uses five as the default limit", () => {
  const rows = Array.from({ length: 7 }, (_, i) => tx({ id: String(i), merchantNormalized: 'M' + i, amountMinor: 100 + i }));
  assert.equal(analytics.topMerchants(rows).length, 5);
});

test("top merchants ranks greater total amounts first", () => {
  const rows = [tx({ merchantNormalized: 'LOW', amountMinor: 100 }), tx({ id: 'high', merchantNormalized: 'HIGH', amountMinor: 900 })];
  assert.equal(analytics.topMerchants(rows)[0].merchantNormalized, 'HIGH');
});

test("daily totals returns zeros when the input has no transactions", () => {
  assert.deepEqual(analytics.dailyTotals([], 4, new Date(2024,0,4)), [0, 0, 0, 0]);
});

test("daily totals ignores records after the selected end day", () => {
  const later = tx({ transactionDate: new Date(2024,0,5,12).toISOString(), amountMinor: 900 });
  assert.deepEqual(analytics.dailyTotals([later], 3, new Date(2024,0,3,20)), [0, 0, 0]);
});

test("monthly periods use a thirty-day window", () => {
  const p = analytics.periodFor('monthly', new Date(2024, 0, 10, 15));
  assert.equal(Math.round((p.to - p.from) / 86400000), 30);
});

test("yearly periods use a 365-day window", () => {
  const p = analytics.periodFor('yearly', new Date(2024, 0, 10, 15));
  assert.equal(Math.round((p.to - p.from) / 86400000), 365);
});

test("monthly previous range ends where the current range begins", () => {
  const p = analytics.periodFor('monthly', new Date(2024, 5, 18));
  assert.equal(p.prevTo.getTime(), p.from.getTime());
});
