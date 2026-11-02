// Document types: the built-in list plus each family's own (custom) categories.
// The client gets the merged list from GET /api/doc-types, so this file is the only copy of the built-ins.

export const DOC_TYPES = ['Aadhaar', 'PAN card', 'Passport', 'Birth certificate', 'Driving licence', 'Voter ID',
  'Insurance policy', 'Medical report', 'School record', 'Photo', 'Other'];

// Built-in types first, then custom ones A→Z. Matching ignores case and outer spaces, so
// " passport" is the built-in "Passport" and "property deed" is the same as "Property Deed".
export function mergeTypes(names) {
  const seen = new Set(DOC_TYPES.map((t) => t.toLowerCase()));
  const custom = [];
  for (const raw of names) {
    const name = typeof raw === 'string' ? raw.trim() : '';
    if (!name || seen.has(name.toLowerCase())) continue;
    seen.add(name.toLowerCase());
    custom.push(name);
  }
  return [...DOC_TYPES, ...custom.sort((a, b) => a.localeCompare(b))];
}

// Cleans a checklist's type list from a request or from Gemini: strings only, trimmed, max 60 chars,
// no duplicates, at most 20, and spelled like a known type when one matches.
export function cleanTypeList(list, known) {
  if (!Array.isArray(list)) return [];
  const knownByLower = new Map(known.map((t) => [t.toLowerCase(), t]));
  const out = new Map();
  for (const raw of list) {
    const name = typeof raw === 'string' ? raw.trim().slice(0, 60) : '';
    if (name && !out.has(name.toLowerCase())) out.set(name.toLowerCase(), knownByLower.get(name.toLowerCase()) ?? name);
  }
  return [...out.values()].slice(0, 20);
}

// Every type this family can pick: built-ins plus any used on its documents or checklists.
// A custom category therefore exists as soon as one document or checklist uses it.
export async function familyDocTypes(db) {
  // shortcut: reads every document's type on each call; fine for one family, add a distinct view if it grows large.
  const [docs, lists] = await Promise.all([db.from('documents').select('doc_type'), db.from('checklists').select('doc_types')]);
  if (docs.error) throw docs.error;
  if (lists.error) throw lists.error;
  return mergeTypes([...docs.data.map((d) => d.doc_type), ...lists.data.flatMap((c) => c.doc_types)]);
}
