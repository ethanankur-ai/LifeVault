// Creates the Supabase clients from environment variables (loaded from server/.env).
import { createClient } from '@supabase/supabase-js';

const { SUPABASE_URL, SUPABASE_SERVICE_KEY } = process.env;
if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY. Copy server/.env.example to server/.env and fill it in.');
}

// A server has no browser session to remember or refresh.
const options = { auth: { persistSession: false, autoRefreshToken: false } };

// Admin client: used only to check login tokens. Do not query tables with it; it skips Row Level Security.
export const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, options);

// Per-request client that acts AS the logged-in user. Supabase applies RLS based on the
// Authorization header, so every query through this client only sees that user's family.
export const supabaseAsUser = (token) =>
  createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    ...options,
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
