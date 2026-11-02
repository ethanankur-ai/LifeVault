// Optional "auto-fill": sends a photo of a document to Gemini and returns the key fields as JSON.
// It never fails hard: if Gemini errors (or GEMINI_API_KEY is missing) it returns 200 with
// empty fields, and the user just types them in.
import { askGemini } from '../gemini.js';
import { DOC_TYPES, familyDocTypes } from '../docTypes.js';

const EMPTY = { doc_type: '', doc_number: '', expiry_date: '', name: '' };

const SCHEMA = {
  type: 'object',
  properties: Object.fromEntries(Object.keys(EMPTY).map((k) => [k, { type: 'string' }])),
  required: Object.keys(EMPTY),
};

// The family's own categories are in the list, so a second "Property Deed" matches the first one.
const prompt = (types) => `This is a photo of a personal or household document. Return:
- doc_type: the matching category from this list, spelled exactly as written: ${types.join(', ')}.
  If none fits, invent a short category name in Title Case (2-4 words), for example "Property Deed".
  Use "Other" only if you cannot tell what the document is.
- doc_number: the document number.
- expiry_date: the expiry date as YYYY-MM-DD.
- name: the holder's full name.
Use "" for anything you cannot read.`;

// POST /api/extract  body: { image: "data:image/jpeg;base64,..." }
// That string is exactly what FileReader.readAsDataURL() produces in the browser.
export async function extract(req, res) {
  const match = /^data:(image\/[\w.+-]+);base64,(.+)$/.exec(req.body?.image ?? '');
  if (!match) return res.status(400).json({ error: 'image must be a base64 image data URL' });
  const [, mimeType, data] = match;

  const types = await familyDocTypes(req.db).catch(() => DOC_TYPES);
  const answer = await askGemini([{ inlineData: { mimeType, data } }, { text: prompt(types) }], SCHEMA);
  res.json({ ...EMPTY, ...answer });
}
