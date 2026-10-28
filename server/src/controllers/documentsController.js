// Logic for /api/documents. The file itself goes straight from the browser to Supabase Storage;
// this API only saves and searches the metadata about it.

const MS_PER_DAY = 24 * 60 * 60 * 1000;
// "YYYY-MM-DD" for today + n days (UTC), the format Postgres date columns compare against.
const dateInDays = (n) => new Date(Date.now() + n * MS_PER_DAY).toISOString().slice(0, 10);

// GET /api/documents?q=&member=&type=
export async function listDocuments(req, res) {
  const { q, member, type } = req.query;

  // documents_search is a database view: documents + one search_text column built from
  // doc_type, doc_number and tags, so a single ILIKE covers all three.
  let query = req.db.from('documents_search').select('*').order('created_at', { ascending: false });
  if (q) query = query.ilike('search_text', `%${q}%`);
  if (member) query = query.eq('member_id', member);
  if (type) query = query.eq('doc_type', type);

  const { data, error } = await query;
  if (error) throw error;
  res.json(data);
}

// GET /api/documents/expiring: documents expiring between today and 60 days from now.
export async function listExpiring(req, res) {
  const { data, error } = await req.db
    .from('documents')
    .select('*')
    .gte('expiry_date', dateInDays(0))
    .lte('expiry_date', dateInDays(60))
    .order('expiry_date');
  if (error) throw error;
  res.json(data);
}

// POST /api/documents: call this after the client has uploaded the file to Storage.
export async function createDocument(req, res) {
  const { member_id, file_path, doc_type, doc_number, expiry_date, tags, extracted_json } = req.body ?? {};
  if (!member_id || !file_path) {
    return res.status(400).json({ error: 'member_id and file_path are required' });
  }

  // Fields are picked one by one so a client can't set id or family_id itself.
  const { data, error } = await req.db
    .from('documents')
    .insert({
      member_id,
      file_path,
      doc_type,
      doc_number,
      expiry_date: expiry_date || null, // auto-fill may send "" when it couldn't read a date
      tags: tags ?? [],
      extracted_json,
    })
    .select()
    .single();
  if (error) throw error;
  res.status(201).json(data);
}
