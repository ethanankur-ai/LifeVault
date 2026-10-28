// Smoke test: the server boots, and every API route rejects requests that have no login token.
// Run with `npm test`. Needs no real Supabase or Gemini; nothing here talks to the network.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';

process.env.SUPABASE_URL = 'http://localhost:54321';
process.env.SUPABASE_SERVICE_KEY = 'test-key';
process.env.PORT = '0'; // any free port

// Imported after setting env vars, because config/supabase.js reads them on load.
const { server } = await import('../src/index.js');
if (!server.listening) await once(server, 'listening');
const base = `http://localhost:${server.address().port}`;
after(() => server.close());

for (const [method, path] of [
  ['GET', '/api/members'],
  ['POST', '/api/members'],
  ['GET', '/api/documents'],
  ['GET', '/api/documents/expiring'],
  ['POST', '/api/documents'],
  ['POST', '/api/extract'],
]) {
  test(`${method} ${path} without a token → 401`, async () => {
    const res = await fetch(base + path, { method });
    assert.equal(res.status, 401);
  });
}
