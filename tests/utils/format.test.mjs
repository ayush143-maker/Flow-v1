import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'vite';

let server;
let format;

before(async () => {
  server = await createServer({
    configFile: 'vite.config.ts',
    server: { middlewareMode: true },
    appType: 'custom',
  });
  format = await server.ssrLoadModule('/src/utils/format.ts');
});

after(async () => {
  await server?.close();
});

test('formats whole rupee values without decimal places', () => {
  assert.equal(format.formatMoney(100), '₹1');
});

test('formats paise with two decimal places', () => {
  assert.equal(format.formatMoney(123), '₹1.23');
});

test('compact formatter uses thousands for four-digit rupee values', () => {
  assert.equal(format.formatMoneyCompact(100000), '₹1.0k');
});

test('compact formatter uses lakh suffix at one lakh rupees', () => {
  assert.equal(format.formatMoneyCompact(10000000), '₹1.0L');
});

test('compact formatter uses crore suffix at one crore rupees', () => {
  assert.equal(format.formatMoneyCompact(1000000000), '₹1.0Cr');
});

test('percentage change reports an increase', () => {
  assert.equal(format.percentChange(150, 100), 50);
});

test('percentage change reports a decrease', () => {
  assert.equal(format.percentChange(50, 100), -50);
});

test('percentage change returns null when the previous value is zero', () => {
  assert.equal(format.percentChange(100, 0), null);
});

test('percentage change returns null when the previous value is negative', () => {
  assert.equal(format.percentChange(100, -5), null);
});

test('percentage change handles a complete decrease to zero', () => {
  assert.equal(format.percentChange(0, 100), -100);
});

test("formats compact values below one thousand rupees", () => {
  assert.equal(format.formatMoneyCompact(12345), '₹123');
});

test("uses the night greeting before five", () => {
  assert.equal(format.greeting(new Date(2024, 0, 1, 4)), 'Good night');
});

test("uses the morning greeting from five", () => {
  assert.equal(format.greeting(new Date(2024, 0, 1, 5)), 'Good morning');
});

test("uses the afternoon greeting from noon", () => {
  assert.equal(format.greeting(new Date(2024, 0, 1, 12)), 'Good afternoon');
});

test("uses the evening greeting from five", () => {
  assert.equal(format.greeting(new Date(2024, 0, 1, 17)), 'Good evening');
});

test("normalizes merchant case punctuation and whitespace", () => {
  assert.equal(format.normalizeMerchant('  m&m   Store! '), 'MM Store');
});

test("returns an empty normalized key for empty merchant text", () => {
  assert.equal(format.normalizeMerchant('   '), '');
});

test("produces the known FNV-1a hash for hello", () => {
  assert.equal(format.fnv1a('hello'), '4f9f2cab');
});

test("produces the FNV-1a offset basis hash for an empty string", () => {
  assert.equal(format.fnv1a(''), '811c9dc5');
});

test("starts a day at local midnight", () => {
  const d = format.startOfDay(new Date(2024, 3, 12, 16, 35, 22));
  assert.equal(d.getHours(), 0);
  assert.equal(d.getMinutes(), 0);
  assert.equal(d.getSeconds(), 0);
});

test("adds days across a month boundary", () => {
  assert.equal(format.addDays(new Date(2024, 0, 31), 1).getDate(), 1);
  assert.equal(format.addDays(new Date(2024, 0, 31), 1).getMonth(), 1);
});

test("returns the first day of the month", () => {
  const d = format.startOfMonth(new Date(2024, 4, 19, 12));
  assert.equal(d.getDate(), 1);
  assert.equal(d.getMonth(), 4);
});

test("counts leap February correctly", () => {
  assert.equal(format.daysInMonth(new Date(2024, 1, 5)), 29);
});

test("counts non-leap February correctly", () => {
  assert.equal(format.daysInMonth(new Date(2023, 1, 5)), 28);
});

test("labels a transaction on the current local date as today", () => {
  const now = new Date(2024, 0, 2, 18);
  const sameDay = new Date(2024, 0, 2, 8).toISOString();
  assert.equal(format.dayLabel(sameDay, now), 'Today');
});

test("labels the preceding local date as yesterday", () => {
  const now = new Date(2024, 0, 2, 18);
  const priorDay = new Date(2024, 0, 1, 8).toISOString();
  assert.equal(format.dayLabel(priorDay, now), 'Yesterday');
});

test("formats a month label in the Indian locale", () => {
  assert.equal(format.monthLabel(new Date(2024, 0, 1)), 'January');
});

test("normalizes repeated spaces in merchant names", () => {
  assert.equal(format.normalizeMerchant('alpha     beta'), 'ALPHA BETA');
});

test("normalizes punctuation-only merchant names to an empty key", () => {
  assert.equal(format.normalizeMerchant('!@#$%'), '');
});
