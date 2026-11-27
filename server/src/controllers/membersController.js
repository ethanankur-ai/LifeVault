// Logic for /api/members. req.db only sees the user's own family (Row Level Security),
// so there is no "where family_id = ..." here; the database adds it for us.
import { badRequest, isDate, text } from '../validate.js';

export async function listMembers(req, res) {
  const { data, error } = await req.db.from('members').select('*').order('name');
  if (error) throw error;
  res.json(data);
}

export async function createMember(req, res) {
  const name = text(req.body?.name, 100, 'name');
  if (!name) throw badRequest('name is required');
  const relation = text(req.body?.relation, 50, 'relation') || null;
  const dob = req.body?.dob || null; // the form sends "" when left empty
  if (dob && (!isDate(dob) || dob > new Date().toISOString().slice(0, 10))) {
    throw badRequest('dob must be a date in the past, written YYYY-MM-DD');
  }

  // family_id is filled in by the database default: the logged-in user's family.
  const { data, error } = await req.db.from('members').insert({ name, relation, dob }).select().single();
  if (error) throw error;
  res.status(201).json(data);
}
