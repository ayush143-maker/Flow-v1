import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'vite';

let server;
let recurring;
before(async () => {
  server = await createServer({ configFile: 'vite.config.ts', server: { middlewareMode: true }, appType: 'custom' });
  recurring = await server.ssrLoadModule('/src/services/analytics/recurring.ts');
});
after(async () => { await server?.close(); });

function tx(day, overrides = {}) {
  const date = new Date(2024, 0, day, 12).toISOString();
  return {
    id: String(day), amountMinor: 10000, currency: 'INR', merchant: 'Stream',
    merchantNormalized: 'STREAM', category: 'Subscriptions', type: 'debit',
    source: 'manual', paymentMethod: null, accountHint: null,
    transactionDate: date, createdAt: date, originalMessage: null,
    messageHash: 'hash-' + day, referenceId: null, isTestData: false, metadata: null,
    ...overrides,
  };
}

test('does not infer a recurring payment from one transaction', () => {
  assert.deepEqual(recurring.detectRecurring([tx(1)]), []);
});
test('ignores credit transactions when detecting recurring debits', () => {
  assert.deepEqual(recurring.detectRecurring([tx(1, { type: 'credit' }), tx(31, { type: 'credit' })]), []);
});
test('recognizes roughly monthly debit intervals', () => {
  const found = recurring.detectRecurring([tx(1), tx(31)]);
  assert.equal(found.length, 1);
  assert.equal(found[0].frequency, 'monthly');
  assert.equal(found[0].merchantNormalized, 'STREAM');
});
test('recognizes weekly debit intervals', () => {
  const found = recurring.detectRecurring([tx(1), tx(8)]);
  assert.equal(found.length, 1);
  assert.equal(found[0].frequency, 'weekly');
});
test('rejects a merchant whose intervals vary too widely', () => {
  const rows = [tx(1), tx(26), tx(31)];
  assert.equal(recurring.detectRecurring(rows).length, 0);
});
test('rejects a recurring group with a large amount swing', () => {
  const rows = [tx(1, { amountMinor: 10000 }), tx(31, { amountMinor: 14000 })];
  assert.equal(recurring.detectRecurring(rows).length, 0);
});
test('uses the median amount for an odd number of occurrences', () => {
  const rows = [tx(1, { amountMinor: 10000 }), tx(31, { amountMinor: 11000 }), tx(60, { amountMinor: 12000 })];
  const found = recurring.detectRecurring(rows);
  assert.equal(found.length, 1);
  assert.equal(found[0].amountMinor, 11000);
});
test('marks a two-occurrence recurrence as an estimate', () => {
  assert.equal(recurring.detectRecurring([tx(1), tx(31)])[0].isEstimate, true);
});
test('predicts the next date from the last observed date', () => {
  const rows = [tx(1), tx(31)];
  const found = recurring.detectRecurring(rows)[0];
  assert.equal(new Date(found.nextExpected).getTime(), new Date(rows[1].transactionDate).getTime() + 30 * 86400000);
});
test('keeps monthly equivalent unchanged for monthly payments', () => {
  assert.equal(recurring.monthlyEquivalentMinor({ frequency: 'monthly', amountMinor: 12000 }), 12000);
});

test("converts weekly payments to a monthly equivalent", () => {
  assert.equal(recurring.monthlyEquivalentMinor({ frequency: 'weekly', amountMinor: 43300 }), 10000);
});

test("converts quarterly payments to a monthly equivalent", () => {
  assert.equal(recurring.monthlyEquivalentMinor({ frequency: 'quarterly', amountMinor: 30000 }), 10000);
});

test("converts yearly payments to a monthly equivalent", () => {
  assert.equal(recurring.monthlyEquivalentMinor({ frequency: 'yearly', amountMinor: 120000 }), 10000);
});

test("sorts recurring payments by monthly equivalent descending", () => {
  const rows = [tx(1, { merchantNormalized: 'LOW', amountMinor: 3000 }), tx(1, { id: 'high1', merchantNormalized: 'HIGH', amountMinor: 9000 }), tx(31, { id: 'high2', merchantNormalized: 'HIGH', amountMinor: 9000 })];
  const found = recurring.detectRecurring(rows);
  assert.equal(found[0].merchantNormalized, 'HIGH');
});
