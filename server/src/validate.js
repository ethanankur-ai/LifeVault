// Small input checks shared by the controllers. Anything wrong throws a 400, which the error handler in index.js sends back.
export const badRequest = (message) => Object.assign(new Error(message), { status: 400 });

// Optional text field: undefined/null/"" → "", otherwise a trimmed string of at most `max` characters.
export function text(value, max, field) {
  if (value == null) return '';
  if (typeof value !== 'string') throw badRequest(`${field} must be text`);
  const s = value.trim();
  if (s.length > max) throw badRequest(`${field} is too long (max ${max} characters)`);
  return s;
}

// A real calendar date written "YYYY-MM-DD" ("2020-02-31" and "2020-13-45" are not).
export function isDate(s) {
  if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(s);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}
