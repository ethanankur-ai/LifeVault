// Optional "auto-fill": sends a photo of a document to Gemini and returns the key fields as JSON.
// It never fails hard: if Gemini errors (or GEMINI_API_KEY is missing) it returns 200 with
// empty fields, and the user just types them in.
import { GoogleGenAI } from '@google/genai';

const EMPTY = { doc_type: '', doc_number: '', expiry_date: '', name: '' };

// Tried in order (see the loop in extract below).
const MODELS = ['gemini-3.5-flash', 'gemini-3.5-flash-lite'];

// Same list as client/src/lib/docTypes.js (keep them in sync), so the answer matches the form's dropdown.
const DOC_TYPES = ['Aadhaar', 'PAN card', 'Passport', 'Birth certificate', 'Driving licence', 'Voter ID',
  'Insurance policy', 'Medical report', 'School record', 'Photo', 'Other'];

const PROMPT = `This is a photo of a personal or household document (passport, PAN card, Aadhaar,
driving licence, insurance policy, etc.). Return the document type, the document number,
the expiry date as YYYY-MM-DD, and the holder's full name. Use "" for anything you cannot read.`;

// POST /api/extract  body: { image: "data:image/jpeg;base64,..." }
// That string is exactly what FileReader.readAsDataURL() produces in the browser.
export async function extract(req, res) {
  const match = /^data:(image\/[\w.+-]+);base64,(.+)$/.exec(req.body?.image ?? '');
  if (!match) return res.status(400).json({ error: 'image must be a base64 image data URL' });
  const [, mimeType, data] = match;

  // The free tier often answers 503 "high demand" for one model while another still works,
  // so try each in turn, giving each 15 s before moving on.
  for (const model of MODELS) {
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const response = await ai.models.generateContent({
        model,
        contents: [{ inlineData: { mimeType, data } }, { text: PROMPT }],
        config: {
          abortSignal: AbortSignal.timeout(15_000),
          // Makes Gemini reply with JSON in exactly this shape instead of free text.
          responseMimeType: 'application/json',
          responseJsonSchema: {
            type: 'object',
            properties: {
              doc_type: { type: 'string', enum: [...DOC_TYPES, ''] },
              doc_number: { type: 'string' },
              expiry_date: { type: 'string' },
              name: { type: 'string' },
            },
            required: Object.keys(EMPTY),
          },
        },
      });
      return res.json({ ...EMPTY, ...JSON.parse(response.text) });
    } catch (err) {
      console.error(`Gemini extract with ${model} failed:`, err.message);
    }
  }
  res.json(EMPTY);
}
