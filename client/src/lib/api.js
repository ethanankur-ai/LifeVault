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
  const json = await res.json()
  // The server sends { error: "..." } on failure; surface it to the screen.
  if (!res.ok) throw new Error(json.error || res.statusText)
  return json
}
