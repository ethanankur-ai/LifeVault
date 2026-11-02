// Unit tests for the document type helpers (custom categories). Run with `npm test`.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DOC_TYPES, mergeTypes, cleanTypeList } from '../src/docTypes.js';

test('mergeTypes: built-ins first, then custom types without case duplicates, A→Z', () => {
  assert.deepEqual(
    mergeTypes(['passport', 'Property Deed', ' property deed ', null, '', 'Gas Bill']),
    [...DOC_TYPES, 'Gas Bill', 'Property Deed'],
  );
});

test('cleanTypeList: trims, dedupes, reuses the known spelling, drops non-strings', () => {
  const known = mergeTypes(['Gas Bill']);
  assert.deepEqual(cleanTypeList([' passport', 'PASSPORT', 'gas bill', 42, '', 'Visa Letter'], known), ['Passport', 'Gas Bill', 'Visa Letter']);
  assert.deepEqual(cleanTypeList('not a list', known), []);
  assert.equal(cleanTypeList(Array.from({ length: 30 }, (_, i) => `Type ${i}`), known).length, 20);
});
