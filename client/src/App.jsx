// Top-level screen: shows Login until there is a Supabase session, then the vault with tabs.
import { useCallback, useEffect, useState } from 'react'
import { supabase } from './lib/supabase.js'
import { api } from './lib/api.js'
import Login from './components/Login.jsx'
import Members from './components/Members.jsx'
import UploadForm from './components/UploadForm.jsx'
import DocumentList from './components/DocumentList.jsx'

const TABS = ['Documents', 'Add document', 'Members']

function App() {
  // undefined = still checking, null = logged out, object = logged in
  const [session, setSession] = useState(undefined)
  const [tab, setTab] = useState(TABS[0])
  // Loaded once here because several tabs (upload, filters, scenarios) need the member list.
  const [members, setMembers] = useState([])
  const [error, setError] = useState('')

  useEffect(() => {
    // Restores a saved login on page refresh, then keeps listening for log in / log out.
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data } = supabase.auth.onAuthStateChange((_event, session) => setSession(session))
    return () => data.subscription.unsubscribe()
  }, [])

  const loadMembers = useCallback(() => {
    api('/api/members').then(setMembers).catch((err) => setError(err.message))
  }, [])

  // Keyed on the user id, not the session object: Supabase replaces the session on every token refresh.
  const userId = session?.user.id
  useEffect(() => {
    if (userId) loadMembers()
  }, [userId, loadMembers])

  if (session === undefined) return null
  if (!session) return <Login />

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="flex items-center justify-between bg-white px-4 py-3 shadow-sm">
        <h1 className="text-xl font-bold text-slate-800">LifeVault</h1>
        <div className="flex items-center gap-3 text-sm">
          <span className="hidden text-slate-500 sm:inline">{session.user.email}</span>
          <button onClick={() => supabase.auth.signOut()} className="rounded-lg border border-slate-300 px-3 py-1 hover:bg-slate-100">
            Log out
          </button>
        </div>
      </header>

      <nav className="flex gap-1 overflow-x-auto border-b border-slate-200 bg-white px-4">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            aria-current={tab === t ? 'page' : undefined}
            className={`whitespace-nowrap border-b-2 px-3 py-2 text-sm ${tab === t ? 'border-indigo-600 font-medium text-indigo-700' : 'border-transparent text-slate-600'}`}
          >
            {t}
          </button>
        ))}
      </nav>

      <main className="mx-auto max-w-4xl space-y-4 p-4">
        {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
        {tab === 'Documents' && <DocumentList members={members} />}
        {tab === 'Add document' && <UploadForm members={members} onSaved={() => setTab('Documents')} />}
        {tab === 'Members' &&<Members members={members} onChange={loadMembers} />}
      </main>
    </div>
  )
}

export default App
