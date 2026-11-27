// Calls our Express API with the logged-in user's token, so requireAuth on the server lets us in.
import { supabase } from './supabase.js'

export async function api(path, { method = 'GET', body } = {}) {
  // getSession() also refreshes the token if it has expired (they last 1 hour).
  const { data } = await supabase.auth.getSession()
  const res = await fetch(import.meta.env.VITE_API_URL + path, {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${data.session?.access_token}` },
    body: body && JSON.stringify(body),
  })
  // Read as text first: gateway errors (502, 504, 413) are plain text or HTML, and res.json() would
  // throw "Unexpected token…" at the user instead of a readable message.
  const raw = res.status === 204 ? '' : await res.text()
  let json = null
  try { json = raw ? JSON.parse(raw) : null } catch { /* not JSON: handled below */ }

  // The server no longer accepts this login (expired or revoked): go back to the login screen.
  if (res.status === 401) supabase.auth.signOut()
  // The server sends { error: "..." } on failure; surface it to the screen.
  if (!res.ok) {
    throw new Error(json?.error || (res.status === 413 ? 'That is too large to send.' : `Something went wrong on the server (${res.status}). Please try again.`))
  }
  return json
}
