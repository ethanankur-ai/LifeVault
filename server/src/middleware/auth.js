// Checks the "Authorization: Bearer <token>" header the client sends after logging in with Supabase.
// On success it sets req.user and req.db (a Supabase client scoped to that user), then calls next().
import { supabase, supabaseAsUser } from '../config/supabase.js';

export async function requireAuth(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Missing Authorization header' });

  // Asks Supabase Auth whether the token is real and not expired.
  const { data, error } = await supabase.auth.getUser(token);
  if (error) return res.status(401).json({ error: 'Invalid or expired token' });

  req.user = data.user;
  req.db = supabaseAsUser(token);
  next();
}
