// Logic for /api/checklists: the family's own checklists, optionally drafted by AI.
// (The built-in ones, like "School admission", live in the client.)
import { askGemini } from '../gemini.js';
import { DOC_TYPES, cleanTypeList, familyDocTypes } from '../docTypes.js';

const FIELDS = 'id, name, doc_types';

// GET /api/checklists
export async function listChecklists(req, res) {
  const { data, error } = await req.db.from('checklists').select(FIELDS).order('created_at');
  if (error) throw error;
  res.json(data);
}

// POST /api/checklists  body: { name, doc_types: ["Passport", "Visa Letter", ...] }
// Types not in the family's list yet become new custom categories.
export async function createChecklist(req, res) {
  const name = String(req.body?.name ?? '').trim().slice(0, 60);
  const doc_types = cleanTypeList(req.body?.doc_types, await familyDocTypes(req.db));
  if (!name || doc_types.length === 0) {
    return res.status(400).json({ error: 'A checklist needs a name and at least one document type' });
  }
  const { data, error } = await req.db.from('checklists').insert({ name, doc_types }).select(FIELDS).single();
  if (error) throw error;
  res.status(201).json(data);
}

// DELETE /api/checklists/:id
export async function deleteChecklist(req, res) {
  // RLS hides other families' rows, so "0 deleted" means not found for this user.
  const { error, count } = await req.db.from('checklists').delete({ count: 'exact' }).eq('id', req.params.id);
  if (error) throw error;
  if (count === 0) return res.status(404).json({ error: 'Checklist not found' });
  res.status(204).end();
}

const SUGGEST_SCHEMA = {
  type: 'object',
  properties: { name: { type: 'string' }, doc_types: { type: 'array', items: { type: 'string' } } },
  required: ['name', 'doc_types'],
};

// POST /api/checklists/suggest  body: { situation: "UK tourist visa for my son" }
// Gemini drafts a checklist that the user edits before saving. Never fails hard: on any AI problem
// it returns an empty list and the user adds the types by hand.
export async function suggestChecklist(req, res) {
  const situation = String(req.body?.situation ?? '').trim();
  if (!situation || situation.length > 200) {
    return res.status(400).json({ error: 'Describe the situation in up to 200 characters' });
  }
  const known = await familyDocTypes(req.db).catch(() => DOC_TYPES);
  const answer = await askGemini([{ text: `A family stores its documents in an app and needs a checklist for this situation: "${situation}".
List the documents one family member usually needs for it, most important first, 2 to 10 items.
Reuse names from this list, spelled exactly, whenever one fits: ${known.join(', ')}.
For anything not in the list, use a short name in Title Case (2-4 words), for example "Visa Application Form".
Also give the checklist a short name (at most 5 words).` }], SUGGEST_SCHEMA);
  res.json({
    name: String(answer?.name || situation).trim().slice(0, 60),
    doc_types: cleanTypeList(answer?.doc_types, known),
  });
}
