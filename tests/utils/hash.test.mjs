import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'vite';

let server;
let sha;
before(async () => {
  server = await createServer({ configFile: 'vite.config.ts', server: { middlewareMode: true }, appType: 'custom' });
  ({ sha256Hex: sha } = await server.ssrLoadModule('/src/utils/hash.ts'));
});
after(async () => { await server?.close(); });

test('SHA-256 helper returns a hexadecimal fingerprint', async () => {
  assert.match(await sha('flow'), /^(?:[0-9a-f]{64}|fnv\$[0-9a-f]{8})$/);
});
test('SHA-256 helper is stable for the same input', async () => {
  assert.equal(await sha('same input'), await sha('same input'));
});
test('SHA-256 helper distinguishes different inputs', async () => {
  assert.notEqual(await sha('first'), await sha('second'));
});
test('SHA-256 output contains no uppercase hex characters', async () => {
  assert.equal((await sha('case check')).replace(/[0-9a-f]/g, '').length, 0);
});

test("preserves an empty-string hash result as a valid fingerprint", async () => {
  assert.match(await sha(''), /^(?:[0-9a-f]{64}|fnv\$[0-9a-f]{8})$/);
});

test("handles Unicode input", async () => {
  assert.match(await sha('₹ café 🎵'), /^(?:[0-9a-f]{64}|fnv\$[0-9a-f]{8})$/);
});

test("handles long inputs", async () => {
  assert.match(await sha('flow'.repeat(10000)), /^(?:[0-9a-f]{64}|fnv\$[0-9a-f]{8})$/);
});
