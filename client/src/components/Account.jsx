// Header account button: avatar + name. Clicking it opens a small popup to edit your name or log out.
// The popup uses the browser's popover feature, which closes it on outside click and Escape for us.
import { useRef, useState } from 'react'
import { supabase } from '../lib/supabase.js'

// "Rohan Sharma" → "RS", "asha" → "A"; falls back to the email's first letter.
const initials = (name, email) => (name ? name.trim().split(/\s+/).map((w) => w[0]).join('').slice(0, 2) : email[0]).toUpperCase()

export default function Account({ user }) {
  const name = user.user_metadata.full_name
  const popup = useRef(null)
  const [pos, setPos] = useState({ top: 0, right: 0 })
  const [draft, setDraft] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  // Runs on click, just before the browser opens the popup (popoverTarget below).
  function handleOpen(e) {
    const r = e.currentTarget.getBoundingClientRect()
    setPos({ top: r.bottom + 8, right: window.innerWidth - r.right }) // right under the button
    setDraft(name ?? '')
    setError('')
  }

  async function handleSave(e) {
    e.preventDefault()
    setBusy(true)
    setError('')
    // Saved in the Supabase Auth profile; onAuthStateChange in App then re-renders with the new name.
    const { error } = await supabase.auth.updateUser({ data: { full_name: draft.trim() } })
    setBusy(false)
    if (error) return setError(error.message)
    popup.current.hidePopover()
  }

  const avatar = (size) => (
    <span aria-hidden="true" className={`grid ${size} shrink-0 place-items-center rounded-[10px] bg-[#BCD4FF] font-mono font-semibold`}>
      {initials(name, user.email)}
    </span>
  )

  return (
    <>
      <button
        popoverTarget="account-popup"
        onClick={handleOpen}
        aria-label={`Account: ${name || user.email}`}
        className="flex h-11 min-w-0 items-center gap-2 rounded-xl pr-2.5 pl-1 transition hover:bg-paper"
      >
        {avatar('size-9 text-sm')}
        <span className="max-w-32 truncate text-sm font-semibold sm:max-w-48">{name || user.email}</span>
        <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l6 6 6-6" /></svg>
      </button>

      <div ref={popup} id="account-popup" popover="auto" style={pos} className="rise card fixed inset-auto m-0 w-72 max-w-[calc(100vw-2rem)] space-y-4 border-0 p-4 text-ink">
        <div className="flex items-center gap-3">
          {avatar('size-12 text-base')}
          <div className="min-w-0">
            <p className="truncate font-semibold">{name || 'Add your name'}</p>
            <p className="truncate text-sm text-muted">{user.email}</p>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-2 border-t-[1.5px] border-paper pt-4">
          <label htmlFor="full-name" className="label">Your name</label>
          <input id="full-name" className="field" required autoComplete="name" value={draft} onChange={(e) => setDraft(e.target.value)} />
          {error && <p role="alert" className="text-sm text-danger">{error}</p>}
          <button disabled={busy || !draft.trim() || draft.trim() === (name ?? '')} className="btn w-full">
            {busy ? 'Saving…' : 'Save'}
          </button>
        </form>

        <button onClick={() => supabase.auth.signOut()} className="btn-ghost w-full">Log out</button>
      </div>
    </>
  )
}
