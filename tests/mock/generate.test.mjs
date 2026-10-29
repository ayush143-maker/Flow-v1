import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'vite';

let server;
let mock;
before(async () => {
  server = await createServer({ configFile: 'vite.config.ts', server: { middlewareMode: true }, appType: 'custom' });
  mock = await server.ssrLoadModule('/src/services/mock/generate.ts');
});
after(async () => { await server?.close(); });

test('returns an empty array for zero mock history days', () => {
  assert.deepEqual(mock.generateMockTransactions(0, 123), []);
});
test('creates the requested number of test transactions', () => {
  assert.equal(mock.generateTestTransactions(12).length, 12);
});
test('marks every generated test transaction as test data', () => {
  assert.ok(mock.generateTestTransactions(8).every((t) => t.isTestData === true));
});
test('labels generated test transaction sources as test', () => {
  assert.ok(mock.generateTestTransactions(8).every((t) => t.source === 'test'));
});
test('uses INR as the currency for generated test transactions', () => {
  assert.ok(mock.generateTestTransactions(8).every((t) => t.currency === 'INR'));
});

test("generates unique IDs for a generated batch", () => {
  const rows = mock.generateTestTransactions(25);
  assert.equal(new Set(rows.map((t) => t.id)).size, rows.length);
});

test("stores amounts in integer paise", () => {
  assert.ok(mock.generateTestTransactions(20).every((t) => Number.isInteger(t.amountMinor)));
});

test("keeps generated test amounts non-negative", () => {
  assert.ok(mock.generateTestTransactions(20).every((t) => t.amountMinor >= 0));
});

test("normalizes the merchant key consistently", () => {
  assert.ok(mock.generateTestTransactions(20).every((t) => t.merchantNormalized === t.merchant.toUpperCase().replace(/[^A-Z0-9 ]/g, '').replace(/\s+/g, ' ').trim()));
});

test("adds source messages to generated test transactions", () => {
  assert.ok(mock.generateTestTransactions(10).every((t) => typeof t.originalMessage === 'string' && t.originalMessage.length > 0));
});

test("generates a message hash for test transactions", () => {
  assert.ok(mock.generateTestTransactions(10).every((t) => typeof t.messageHash === 'string' && t.messageHash.length > 0));
});

test("generates parseable timestamps for test transactions", () => {
  assert.ok(mock.generateTestTransactions(10).every((t) => Number.isFinite(Date.parse(t.transactionDate)) && Number.isFinite(Date.parse(t.createdAt))));
});

test("sorts generated test transactions newest first", () => {
  const rows = mock.generateTestTransactions(50);
  assert.deepEqual(rows.map((t) => t.transactionDate), [...rows].map((t) => t.transactionDate).sort((a,b) => b.localeCompare(a)));
});

test("provides transaction metadata for test data", () => {
  assert.ok(mock.generateTestTransactions(12).every((t) => t.metadata && typeof t.metadata.bank === 'string'));
});

test("keeps transaction references non-empty in test messages", () => {
  assert.ok(mock.generateTestTransactions(12).every((t) => typeof t.referenceId === 'string' && t.referenceId.length > 0));
});

test("sets creation time equal to transaction time in mock records", () => {
  assert.ok(mock.generateTestTransactions(12).every((t) => t.createdAt === t.transactionDate));
});

test("honors a zero test transaction count", () => {
  assert.deepEqual(mock.generateTestTransactions(0), []);
});

test("honors a single test transaction request", () => {
  assert.equal(mock.generateTestTransactions(1).length, 1);
});

test("applies a learned category rule to generated test data", () => {
  const rules = [{ merchantNormalized: 'SWIGGY', category: 'Custom food', id: 'r1', merchantDisplay: 'Swiggy', hitCount: 1, updatedAt: new Date().toISOString() }];
  const rows = mock.generateTestTransactions(100, rules);
  assert.ok(rows.some((t) => t.merchantNormalized === 'SWIGGY' && t.category === 'Custom food'));
});

test("keeps payment methods within the supported union", () => {
  const supported = new Set(['upi','card','netbanking','atm','wallet','bank_transfer','cash','unknown']);
  assert.ok(mock.generateTestTransactions(30).every((t) => supported.has(t.paymentMethod)));
});

test("marks generated mock history as non-test records", () => {
  const rows = mock.generateMockTransactions(5, 20251031);
  assert.ok(rows.every((t) => t.isTestData === false));
});

test("keeps normal mock history source values valid", () => {
  const rows = mock.generateMockTransactions(5, 20251031);
  assert.ok(rows.every((t) => ['sms','notification'].includes(t.source)));
});

test("uses a repeatable seeded sequence for mock history fields", () => {
  const a = mock.generateMockTransactions(15, 20251031).map(({id,...t}) => t);
  const b = mock.generateMockTransactions(15, 20251031).map(({id,...t}) => t);
  assert.deepEqual(a, b);
});

test("applies learned category rules to ordinary mock history", () => {
  const rules = [{ merchantNormalized: 'JIO', category: 'Connectivity', id: 'r1', merchantDisplay: 'Jio', hitCount: 1, updatedAt: new Date().toISOString() }];
  const rows = mock.generateMockTransactions(35, 20251031, rules);
  assert.ok(rows.some((t) => t.merchantNormalized === 'JIO' && t.category === 'Connectivity'));
});

test("returns an array for ordinary mock history", () => {
  assert.ok(Array.isArray(mock.generateMockTransactions(10, 20251031)));
});

test("different seeds vary ordinary mock transaction fields", () => {
  const a = mock.generateMockTransactions(40, 20251031).map(({id,...t}) => t);
  const b = mock.generateMockTransactions(40, 20251032).map(({id,...t}) => t);
  assert.notDeepEqual(a, b);
});

test("ordinary mock history carries normalized merchant keys", () => {
  assert.ok(mock.generateMockTransactions(25, 20251031).every((t) => typeof t.merchantNormalized === 'string' && t.merchantNormalized.length > 0));
});
