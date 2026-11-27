// Logic for /api/documents. The file itself goes straight from the browser to Supabase Storage;
// this API only saves and searches the metadata about it.
import { badRequest, isDate, text } from '../validate.js';

const MS_PER_DAY = 24 * 60 * 60 * 1000;
// "YYYY-MM-DD" for a date + n days, the format Postgres date columns compare against.
const addDays = (date, n) => new Date(Date.parse(date) + n * MS_PER_DAY).toISOString().slice(0, 10);

// GET /api/documents?q=&member=&type=
export async function listDocuments(req, res) {
  const { q, member, type } = req.query;

  // documents_search is a database view: documents + one search_text column built from
  // doc_type, doc_number and tags, so a single ILIKE covers all three.
  let query = req.db.from('documents_search').select('*').order('created_at', { ascending: false });
  // Backslash-escape % and _ so a search for "50%" is literal text, not a wildcard that matches everything.
  if (q) query = query.ilike('search_text', `%${String(q).replace(/[\\%_]/g, '\\$&')}%`);
  if (member) query = query.eq('member_id', String(member));
  if (type) query = query.eq('doc_type', String(type));

  const { data, error } = await query;
  if (error) throw error;
  res.json(data);
}

// GET /api/documents/expiring[?today=YYYY-MM-DD]: documents expiring between today and 60 days from now.
// The browser sends its own calendar day as `today`, because for a user in India the server's (UTC) day is
// still "yesterday" until 05:30 local time. Without it the server's UTC day is used.
export async function listExpiring(req, res) {
  const today = isDate(req.query.today) ? req.query.today : new Date().toISOString().slice(0, 10);
  const { data, error } = await req.db
    .from('documents')
    .select('*')
    .gte('expiry_date', today)
    .lte('expiry_date', addDays(today, 60))
    .order('expiry_date');
  if (error) throw error;
  res.json(data);
}

// POST /api/documents: call this after the client has uploaded the file to Storage.
export async function createDocument(req, res) {
  const body = req.body ?? {};
  const member_id = text(body.member_id, 40, 'member_id');
  const file_path = text(body.file_path, 300, 'file_path');
  if (!member_id || !file_path) throw badRequest('member_id and file_path are required');

  // The file must sit in this family's own storage folder, as the upload form and README describe.
  // (Storage's own policy already blocks reading other folders; this stops a bad path being saved at all.)
  const { data: family, error: famErr } = await req.db.from('families').select('id').single();
  if (famErr) throw famErr;
  if (!file_path.startsWith(`${family.id}/`) || file_path.includes('..')) {
    throw badRequest('file_path must be inside your own family folder');
  }

  const expiry_date = body.expiry_date || null; // auto-fill may send "" when it couldn't read a date
  if (expiry_date && !isDate(expiry_date)) throw badRequest('expiry_date must be YYYY-MM-DD');
  if (body.tags != null && !Array.isArray(body.tags)) throw badRequest('tags must be a list');
  const tags = (body.tags ?? []).map((t) => text(t, 40, 'tag')).filter(Boolean);
  if (tags.length > 20) throw badRequest('At most 20 tags');
  if (body.extracted_json != null && JSON.stringify(body.extracted_json).length > 10_000) throw badRequest('extracted_json is too large');

  // Fields are picked one by one so a client can't set id or family_id itself.
  const { data, error } = await req.db
    .from('documents')
    .insert({
      member_id,
      file_path,
      doc_type: text(body.doc_type, 60, 'doc_type') || null,
      doc_number: text(body.doc_number, 60, 'doc_number') || null,
      expiry_date,
      tags,
      extracted_json: body.extracted_json ?? null,
    })
    .select()
    .single();
  if (error) throw error;
  res.status(201).json(data);
}
