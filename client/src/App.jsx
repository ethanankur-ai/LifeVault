// Top-level screen: shows Login until there is a Supabase session, then the vault with tabs.
import { useCallback, useEffect, useState } from 'react'
import { supabase } from './lib/supabase.js'
import { api } from './lib/api.js'
import Login from './components/Login.jsx'
import Members from './components/Members.jsx'
import UploadForm from './components/UploadForm.jsx'
import DocumentList from './components/DocumentList.jsx'
import ExpiringPanel from './components/ExpiringPanel.jsx'
import Scenarios from './components/Scenarios.jsx'
import FolderTabs from './components/FolderTabs.jsx'
import Account from './components/Account.jsx'

const TABS = ['Documents', 'Add document', 'Checklists', 'Members']
// Folder-tab colour per member, in list order, so each person is recognisable everywhere.
const MEMBER_COLORS = ['#FFD0B5', '#BCD4FF', '#C8EFC0', '#E2CCFF', '#FFE58F', '#B8ECEA']

function App() {
  // undefined = still checking, null = logged out, object = logged in
  const [session, setSession] = useState(undefined)
  const [tab, setTab] = useState(TABS[0])
  // Loaded once here because several tabs (upload, filters, scenarios) need the member list.
  const [members, setMembers] = useState([])
  // Built-in document types plus the family's custom categories (GET /api/doc-types).
  const [types, setTypes] = useState([])
  const [error, setError] = useState('')
  // { member_id, doc_type } when a checklist's "Add" button opened the upload form.
  const [prefill, setPrefill] = useState(null)

  // Menu clicks start from a clean form; only the checklist's "Add" pre-fills it.
  const openTab = (t) => {
    setTab(t)
    setPrefill(null)
  }

  useEffect(() => {
    // Restores a saved login on page refresh, then keeps listening for log in / log out.
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data } = supabase.auth.onAuthStateChange((_event, session) => setSession(session))
    return () => data.subscription.unsubscribe()
  }, [])

  const loadMembers = useCallback(() => {
    api('/api/members')
      .then((rows) => setMembers(rows.map((m, i) => ({ ...m, color: MEMBER_COLORS[i % MEMBER_COLORS.length] }))))
      .catch((err) => setError(err.message))
  }, [])

  const loadTypes = useCallback(() => {
    api('/api/doc-types').then(setTypes).catch((err) => setError(err.message))
  }, [])

  // Keyed on the user id, not the session object: Supabase replaces the session on every token refresh.
  const userId = session?.user.id
  useEffect(() => {
    if (!userId) return
    loadMembers()
    loadTypes()
  }, [userId, loadMembers, loadTypes])

  if (session === undefined) return null
  if (!session) return <Login />

  return (
    <div className="min-h-screen">
      <header className="border-b-[1.5px] border-line bg-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-2.5">
            <span className="grid size-[34px] place-items-center rounded-lg bg-ink">
              <svg aria-hidden="true" width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /></svg>
            </span>
            <span className="text-lg font-bold tracking-tight">LifeVault</span>
          </div>
          <Account user={session.user} />
        </div>
      </header>

      <main className="mx-auto max-w-4xl space-y-5 px-4 py-5">
        <FolderTabs label="Sections" tabs={TABS.map((t) => ({ value: t, label: t }))} value={tab} onChange={openTab} />
        <div>
          <p className="label">Family file</p>
          <h1 className="text-3xl font-bold tracking-tight">{tab}</h1>
        </div>
        {error && <p role="alert" className="text-sm text-danger">{error}</p>}
        {tab === 'Documents' && (
          <>
            <ExpiringPanel members={members} />
            <DocumentList members={members} types={types} />
          </>
        )}
        {tab === 'Add document' && <UploadForm
            members={members}
            types={types}
            prefill={prefill}
            onSaved={() => {
              loadTypes() // the document may have used a new category
              openTab('Documents')
            }}
          />}
        {tab === 'Checklists' && <Scenarios members={members} types={types} onTypesChange={loadTypes} onAdd={(p) => { setPrefill(p); setTab('Add document') }} />}
        {tab === 'Members' && <Members members={members} onChange={loadMembers} />}
      </main>
    </div>
  )
}

export default App
