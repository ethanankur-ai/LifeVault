// Checks the "Authorization: Bearer <token>" header the client sends after logging in with Supabase.
// On success it sets req.user and req.db (a Supabase client scoped to that user), then calls next().
import { supabase, supabaseAsUser } from '../config/supabase.js';

export async function requireAuth(req, res, next) {
  // The scheme word is case-insensitive (RFC 7235); a bare token with no "Bearer" is not accepted.
  const token = /^Bearer\s+(\S+)$/i.exec(req.headers.authorization ?? '')?.[1];
  if (!token) return res.status(401).json({ error: 'Missing or malformed Authorization header' });

  // Asks Supabase Auth whether the token is real and not expired.
  const { data, error } = await supabase.auth.getUser(token);
  if (error) {
    // Supabase being unreachable or failing is not the user's fault: don't tell the app to log them out.
    const outage = error.name === 'AuthRetryableFetchError' || error.status >= 500;
    return outage
      ? res.status(503).json({ error: 'Sign-in service is unavailable. Please try again shortly.' })
      : res.status(401).json({ error: 'Invalid or expired token' });
  }

  req.user = data.user;
  req.db = supabaseAsUser(token);
  next();
}
