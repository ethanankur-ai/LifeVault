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
  ['GET', '/api/doc-types'],
  ['GET', '/api/checklists'],
  ['POST', '/api/checklists'],
  ['POST', '/api/checklists/suggest'],
  ['DELETE', '/api/checklists/123'],
]) {
  test(`${method} ${path} without a token → 401`, async () => {
    const res = await fetch(base + path, { method });
    assert.equal(res.status, 401);
  });
}

// Header parsing and error shapes (checked before any Supabase call, so no network is needed).
test('a bare token without the "Bearer" scheme → 401', async () => {
  const res = await fetch(base + '/api/members', { headers: { Authorization: 'just-a-token' } });
  assert.equal(res.status, 401);
});

test('"bearer" in lower case is accepted as the scheme (then Supabase, unreachable here, answers → 503, not 401)', async () => {
  const res = await fetch(base + '/api/members', { headers: { Authorization: 'bearer abc' } });
  assert.equal(res.status, 503);
});

test('an unauthenticated request is rejected before its body is parsed', async () => {
  const res = await fetch(base + '/api/members', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{bad' });
  assert.equal(res.status, 401);
});

test('the server does not advertise Express', async () => {
  const res = await fetch(base + '/api/members');
  assert.equal(res.headers.get('x-powered-by'), null);
});
