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
