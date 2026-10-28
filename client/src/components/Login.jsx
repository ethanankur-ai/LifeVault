// Sign up / log in form. On success Supabase stores the session and App.jsx switches screens.
import { useState } from 'react'
import { supabase } from '../lib/supabase.js'

export default function Login() {
  const [mode, setMode] = useState('login') // 'login' | 'signup'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [familyName, setFamilyName] = useState('')
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
          await supabase.auth.signUp({ email, password, options: { data: { family_name: familyName || 'My Family' } } })
    if (error) setError(error.message)
    setBusy(false)
  }

  const input = 'w-full rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500'

  return (
    <main className="min-h-screen grid place-items-center bg-slate-50 px-4">
      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4 rounded-2xl bg-white p-6 shadow">
        <h1 className="text-2xl font-bold text-slate-800">LifeVault</h1>
        <p className="text-sm text-slate-500">
          {mode === 'login' ? 'Log in to your family vault.' : 'Create your family vault.'}
        </p>

        {mode === 'signup' && (
          <label className="block space-y-1">
            <span className="text-sm text-slate-700">Family name</span>
            <input className={input} value={familyName} onChange={(e) => setFamilyName(e.target.value)} placeholder="The Sharmas" />
          </label>
        )}
        <label className="block space-y-1">
          <span className="text-sm text-slate-700">Email</span>
          <input className={input} type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label className="block space-y-1">
          <span className="text-sm text-slate-700">Password</span>
          <input
            className={input}
            type="password"
            required
            minLength={6}
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>

        {error && <p role="alert" className="text-sm text-red-600">{error}</p>}

        <button disabled={busy} className="w-full rounded-lg bg-indigo-600 py-2 font-medium text-white hover:bg-indigo-700 disabled:opacity-50">
          {busy ? 'Please wait…' : mode === 'login' ? 'Log in' : 'Sign up'}
        </button>
        <button
          type="button"
          onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError('') }}
          className="w-full text-sm text-indigo-600 hover:underline"
        >
          {mode === 'login' ? 'New here? Create an account' : 'Already have an account? Log in'}
        </button>
      </form>
    </main>
  )
}
