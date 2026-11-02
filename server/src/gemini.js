// Shared Gemini call for the AI features (auto-fill, checklist drafts). Returns the parsed JSON answer,
// or null if every model failed, so callers fall back to an empty result and the app works without AI.
import { GoogleGenAI } from '@google/genai';

// The free tier often answers 503 "high demand" for one model while another still works,
// so try each in turn, giving each 15 s before moving on.
const MODELS = ['gemini-3.5-flash', 'gemini-3.5-flash-lite'];

export async function askGemini(contents, schema) {
  for (const model of MODELS) {
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const response = await ai.models.generateContent({
        model,
        contents,
        config: {
          abortSignal: AbortSignal.timeout(15_000),
          // Makes Gemini reply with JSON in exactly this shape instead of free text.
          responseMimeType: 'application/json',
          responseJsonSchema: schema,
        },
      });
      return JSON.parse(response.text);
    } catch (err) {
      console.error(`Gemini ${model} failed:`, err.message);
    }
  }
  return null;
}
