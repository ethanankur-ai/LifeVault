// Logic for /api/members. req.db only sees the user's own family (Row Level Security),
// so there is no "where family_id = ..." here; the database adds it for us.

export async function listMembers(req, res) {
  const { data, error } = await req.db.from('members').select('*').order('name');
  if (error) throw error;
  res.json(data);
}

export async function createMember(req, res) {
  const { name, relation, dob } = req.body ?? {};
  if (!name) return res.status(400).json({ error: 'name is required' });

  // family_id is filled in by the database default: the logged-in user's family.
  const { data, error } = await req.db
    .from('members')
    .insert({ name, relation, dob: dob || null })
    .select()
    .single();
  if (error) throw error;
  res.status(201).json(data);
}
