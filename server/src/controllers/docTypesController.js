// Logic for /api/doc-types: the document categories this family can pick from.
import { familyDocTypes } from '../docTypes.js';

// GET /api/doc-types → ["Aadhaar", ..., "Other", "Property Deed", ...] (built-ins first, then custom A→Z)
export async function listDocTypes(req, res) {
  res.json(await familyDocTypes(req.db));
}
