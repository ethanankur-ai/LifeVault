// Optional "auto-fill": sends a photo of a document to Gemini and returns the key fields as JSON.
// It never fails hard: if Gemini errors (or GEMINI_API_KEY is missing) it returns 200 with
// empty fields, and the user just types them in.
import { GoogleGenAI } from '@google/genai';

const EMPTY = { doc_type: '', doc_number: '', expiry_date: '', name: '' };

const PROMPT = `This is a photo of a personal or household document (passport, PAN card, Aadhaar,
driving licence, insurance policy, etc.). Return the document type, the document number,
the expiry date as YYYY-MM-DD, and the holder's full name. Use "" for anything you cannot read.`;

// POST /api/extract  body: { image: "data:image/jpeg;base64,..." }
// That string is exactly what FileReader.readAsDataURL() produces in the browser.
export async function extract(req, res) {
  const match = /^data:(image\/[\w.+-]+);base64,(.+)$/.exec(req.body?.image ?? '');
  if (!match) return res.status(400).json({ error: 'image must be a base64 image data URL' });
  const [, mimeType, data] = match;

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: [{ inlineData: { mimeType, data } }, { text: PROMPT }],
      config: {
        // Makes Gemini reply with JSON in exactly this shape instead of free text.
        responseMimeType: 'application/json',
        responseJsonSchema: {
          type: 'object',
          properties: {
            doc_type: { type: 'string' },
            doc_number: { type: 'string' },
            expiry_date: { type: 'string' },
            name: { type: 'string' },
          },
          required: Object.keys(EMPTY),
        },
      },
    });
    res.json({ ...EMPTY, ...JSON.parse(response.text) });
  } catch (err) {
    console.error('Gemini extract failed:', err.message);
    res.json(EMPTY);
  }
}
