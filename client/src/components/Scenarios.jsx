// Scenario checklists: for one member and one situation, shows which required documents are
// ready, expired or missing. Reuses GET /api/documents?member=; the matching happens here.
import { useEffect, useState } from 'react'
import { api } from '../lib/api.js'
import { SCENARIOS } from '../lib/docTypes.js'

const input = 'w-full rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500'
const today = new Date().toISOString().slice(0, 10)

export default function Scenarios({ members }) {
  const [picked, setPicked] = useState('')
  const [scenario, setScenario] = useState(Object.keys(SCENARIOS)[0])
  const [loaded, setLoaded] = useState({ memberId: null, docs: [] })
  const [error, setError] = useState('')

  // Defaults to the first member, even if the member list arrives after this tab opened.
  const memberId = picked || members[0]?.id

  useEffect(() => {
    if (!memberId) return
    let ignore = false // drop the answer if the member changed before it arrived
    api(`/api/documents?member=${memberId}`)
      .then((docs) => !ignore && setLoaded({ memberId, docs }))
      .catch((err) => !ignore && setError(err.message))
    return () => { ignore = true }
  }, [memberId])

  if (members.length === 0) return <p className="text-slate-500">Add a family member first.</p>
  // Still showing the previous member's documents → treat as loading.
  const docs = loaded.memberId === memberId ? loaded.docs : null

  // Ready = at least one copy that hasn't expired. Documents without an expiry date never expire.
  const status = (type) => {
    const ofType = docs.filter((d) => d.doc_type === type)
    if (ofType.length === 0) return 'missing'
    return ofType.some((d) => !d.expiry_date || d.expiry_date >= today) ? 'ready' : 'expired'
  }
  const LABEL = {
    ready: ['✅', 'Ready', 'text-green-700'],
    expired: ['⚠️', 'Expired', 'text-amber-700'],
    missing: ['❌', 'Missing', 'text-red-700'],
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {Object.keys(SCENARIOS).map((s) => (
          <button
            key={s}
            onClick={() => setScenario(s)}
            aria-pressed={scenario === s}
            className={`rounded-full border px-4 py-1.5 text-sm ${scenario === s ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100'}`}
          >
            {s}
          </button>
        ))}
      </div>
      <select className={`${input} sm:w-64`} aria-label="Member" value={memberId} onChange={(e) => setPicked(e.target.value)}>
        {members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
      </select>

      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
      {docs === null ? (
        <p className="text-slate-500">Loading…</p>
      ) : (
        <ul className="divide-y divide-slate-200 rounded-2xl bg-white shadow">
          {SCENARIOS[scenario].map((type) => {
            const [icon, text, color] = LABEL[status(type)]
            return (
              <li key={type} className="flex justify-between px-4 py-3">
                <span className="text-slate-800">{type}</span>
                <span className={`text-sm font-medium ${color}`}>{icon} {text}</span>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
