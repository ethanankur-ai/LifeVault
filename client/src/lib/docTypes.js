// Built-in scenario checklists: which document types each situation usually needs.
// The type list itself comes from the server (GET /api/doc-types; built-ins in server/src/docTypes.js),
// so names here must match it. Families add their own checklists from the Checklists tab.
export const SCENARIOS = {
  'School admission': ['Birth certificate', 'Aadhaar', 'Photo', 'School record'],
  'Hospital visit': ['Aadhaar', 'Insurance policy', 'Medical report'],
  'Passport renewal': ['Passport', 'Aadhaar', 'PAN card', 'Photo'],
}
