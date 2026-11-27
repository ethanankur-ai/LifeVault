// Unit tests for input validation, the controllers' rules and the rate limiter. No Supabase needed:
// the controllers get a tiny fake `req.db`. Run with `npm test`.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { text, isDate } from '../src/validate.js';
import { createMember } from '../src/controllers/membersController.js';
import { createDocument, listDocuments } from '../src/controllers/documentsController.js';
import { rateLimit } from '../src/middleware/rateLimit.js';

const res = () => {
  const r = { code: 200, body: null, headers: {} };
  r.status = (c) => ((r.code = c), r);
  r.json = (b) => ((r.body = b), r);
  r.set = (k, v) => ((r.headers[k] = v), r);
  return r;
};

// Fake database: remembers what was inserted and the ILIKE pattern; `families` always has one family, "fam1".
function fakeDb() {
  const spy = { inserted: null, pattern: null };
  const from = (table) => {
    const q = {
      select: () => q,
      order: () => q,
      eq: () => q,
      ilike: (_col, pattern) => ((spy.pattern = pattern), q),
      insert: (row) => ((spy.inserted = row), q),
      single: () => Promise.resolve({ data: table === 'families' ? { id: 'fam1' } : spy.inserted, error: null }),
      then: (f) => Promise.resolve({ data: [], error: null }).then(f),
    };
    return q;
  };
  return { db: { from }, spy };
}
const status = (e) => e.status === 400;

test('text(): trims, caps length, rejects non-strings', () => {
  assert.equal(text('  hi  ', 10, 'f'), 'hi');
  assert.equal(text(undefined, 10, 'f'), '');
  assert.throws(() => text('x'.repeat(11), 10, 'f'), status);
  assert.throws(() => text({ a: 1 }, 10, 'f'), status);
});

test('isDate(): real calendar dates only', () => {
  assert.ok(isDate('2024-02-29'));
  for (const bad of ['2023-02-29', '2020-13-45', '31/12/2030', '', null, 20200101]) assert.equal(isDate(bad), false, String(bad));
});

test('createMember: rejects blank, whitespace, non-text, huge names and future birthdays; trims good ones', async () => {
  const { db, spy } = fakeDb();
  const future = new Date(Date.now() + 400 * 864e5).toISOString().slice(0, 10);
  for (const body of [{}, { name: '   ' }, { name: { a: 1 } }, { name: 'x'.repeat(101) }, { name: 'A', dob: '2020-13-45' }, { name: 'A', dob: future }]) {
    await assert.rejects(createMember({ db, body }, res()), status, JSON.stringify(body).slice(0, 40));
  }
  assert.equal(spy.inserted, null, 'nothing reaches the database when input is invalid');
  const r = res();
  await createMember({ db, body: { name: '  Meera  ', relation: ' ', dob: '' } }, r);
  assert.deepEqual(spy.inserted, { name: 'Meera', relation: null, dob: null });
  assert.equal(r.code, 201);
});

test('createDocument: file must be in own family folder; fields are capped and trimmed', async () => {
  const good = { member_id: 'm1', file_path: 'fam1/a.pdf' };
  const bad = [
    { ...good, file_path: 'other-family/a.pdf' },
    { ...good, file_path: 'fam1/../other/a.pdf' },
    { ...good, doc_type: 'T'.repeat(61) },
    { ...good, tags: 'not-a-list' },
    { ...good, tags: Array.from({ length: 21 }, (_, i) => `t${i}`) },
    { ...good, expiry_date: '31/12/2030' },
    { member_id: 'm1' },
  ];
  for (const body of bad) await assert.rejects(createDocument({ db: fakeDb().db, body }, res()), status, JSON.stringify(body).slice(0, 60));
  const { db, spy } = fakeDb();
  await createDocument({ db, body: { ...good, doc_type: '  Passport ', doc_number: ' P1 ', expiry_date: '', tags: [' a ', ''] } }, res());
  assert.deepEqual(
    { t: spy.inserted.doc_type, n: spy.inserted.doc_number, e: spy.inserted.expiry_date, g: spy.inserted.tags },
    { t: 'Passport', n: 'P1', e: null, g: ['a'] },
  );
});

test('listDocuments: % and _ in a search are escaped, so they match literally', async () => {
  const { db, spy } = fakeDb();
  await listDocuments({ db, query: { q: '50%_off' } }, res());
  assert.equal(spy.pattern, '%50\\%\\_off%');
});

test('rateLimit: allows N calls per window per user, then 429 with Retry-After', () => {
  const limit = rateLimit(3, 60_000);
  const call = (id) => { const r = res(); let passed = false; limit({ user: { id } }, r, () => (passed = true)); return { r, passed }; };
  for (let i = 0; i < 3; i++) assert.ok(call('u1').passed);
  const blocked = call('u1');
  assert.equal(blocked.r.code, 429);
  assert.ok(blocked.r.headers['Retry-After']);
  assert.ok(call('u2').passed, 'other users are unaffected');
});
