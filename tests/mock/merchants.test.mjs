import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MERCHANTS, ACCOUNTS } from '../../src/services/mock/merchants.ts';

test('merchant catalogue contains named entries', () => {
  assert.ok(MERCHANTS.length > 0);
});
test('merchant names are unique', () => {
  const names = MERCHANTS.map((m) => m.name);
  assert.equal(new Set(names).size, names.length);
});
test('merchant names are non-empty', () => {
  assert.ok(MERCHANTS.every((m) => m.name.trim().length > 0));
});
test('merchant categories are non-empty', () => {
  assert.ok(MERCHANTS.every((m) => m.category.trim().length > 0));
});
test('merchant minor-unit ranges are ordered', () => {
  assert.ok(MERCHANTS.every((m) => m.minMinor <= m.maxMinor));
});
test('merchant values use non-negative minor units', () => {
  assert.ok(MERCHANTS.every((m) => m.minMinor >= 0 && m.maxMinor >= 0));
});

test("merchant payment methods are populated", () => {
  assert.ok(MERCHANTS.every((m) => ['upi','card','netbanking','atm','wallet','bank_transfer','cash','unknown'].includes(m.method)));
});

test("merchant icons are non-empty", () => {
  assert.ok(MERCHANTS.every((m) => typeof m.icon === 'string' && m.icon.length > 0));
});
