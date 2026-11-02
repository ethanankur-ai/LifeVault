// Sign up / log in form. On success Supabase stores the session and App.jsx switches screens.
import { useState } from 'react'
import { supabase } from '../lib/supabase.js'

export default function Login() {
  const [mode, setMode] = useState('login') // 'login' | 'signup'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [familyName, setFamilyName] = useState('')
  const [fullName, setFullName] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setBusy(true)
    setError('')
    const { error } =
      mode === 'login'
        ? await supabase.auth.signInWithPassword({ email, password })
        : // family_name is read by the sign-up trigger in schema.sql to name the new family.
          await supabase.auth.signUp({ email, password, options: { data: { family_name: familyName || 'My Family', full_name: fullName.trim() } } })
    if (error) setError(error.message)
    setBusy(false)
  }

  return (
    <main className="grid min-h-screen place-items-center px-4 py-10">
      <div className="rise w-full max-w-sm">
        <div className="mb-6 flex items-center gap-3">
          <span className="grid size-12 place-items-center rounded-xl bg-ink">
            <svg aria-hidden="true" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /></svg>
          </span>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">LifeVault</h1>
            <p className="label">Every family document, one file</p>
          </div>
        </div>

        {/* Folder tab on top of the form card, like the document cards inside the app. */}
        <div className="inline-flex h-7 items-center rounded-t-[10px] bg-[#BCD4FF] px-3.5 font-mono text-xs font-semibold tracking-wider uppercase">
          {mode === 'login' ? 'Log in' : 'New family'}
        </div>
        <form onSubmit={handleSubmit} className="card space-y-4 rounded-tl-none p-5">
          {mode === 'signup' && (
            <label className="block space-y-1.5">
              <span className="label">Your name</span>
              <input className="field" required autoComplete="name" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Rohan Sharma" />
            </label>
          )}
          {mode === 'signup' && (
            <label className="block space-y-1.5">
              <span className="label">Family name</span>
              <input className="field" value={familyName} onChange={(e) => setFamilyName(e.target.value)} placeholder="The Sharmas" />
            </label>
          )}
          <label className="block space-y-1.5">
            <span className="label">Email</span>
            <input className="field" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
          <label className="block space-y-1.5">
            <span className="label">Password</span>
            <input
              className="field"
              type="password"
              required
              minLength={6}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>

          {error && <p role="alert" className="text-sm text-danger">{error}</p>}

          <button disabled={busy} className="btn w-full">
            {busy ? 'Please wait…' : mode === 'login' ? 'Log in' : 'Create family vault'}
          </button>
          <button
            type="button"
            onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError('') }}
            className="min-h-11 w-full text-sm font-semibold text-accent hover:underline"
          >
            {mode === 'login' ? 'New here? Create an account' : 'Already have an account? Log in'}
          </button>
        </form>
        <p className="mt-5 text-center text-sm text-muted">Only your family can see your documents.</p>
      </div>
    </main>
  )
}
