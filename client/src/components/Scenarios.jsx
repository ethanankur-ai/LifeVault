// Scenario checklists: for one member and one situation, shows which required documents are
// ready, expired or missing. Reuses GET /api/documents?member=; the matching happens here.
import { useEffect, useState } from 'react'
import { api } from '../lib/api.js'
import { SCENARIOS } from '../lib/docTypes.js'
import { today } from '../lib/dates.js'
import FolderTabs from './FolderTabs.jsx'

// Rubber-stamp text and colour per checklist status.
const STAMP = {
  ready: ['Ready', 'border-ok text-ok'],
  expired: ['Expired', 'border-warn text-warn'],
  missing: ['Missing', 'border-danger text-danger'],
}

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

  if (members.length === 0) return <p className="text-muted">Add a family member first.</p>
  // Still showing the previous member's documents → treat as loading.
  const docs = loaded.memberId === memberId ? loaded.docs : null

  // Ready = at least one copy that hasn't expired. Documents without an expiry date never expire.
  const status = (type) => {
    const ofType = docs.filter((d) => d.doc_type === type)
    if (ofType.length === 0) return 'missing'
    return ofType.some((d) => !d.expiry_date || d.expiry_date >= today) ? 'ready' : 'expired'
  }
  const items = docs && SCENARIOS[scenario].map((type) => ({ type, status: status(type) }))
  const ready = items?.filter((i) => i.status === 'ready').length

  return (
    <div className="space-y-4">
      <div role="group" aria-label="Situation" className="flex flex-wrap gap-2">
        {Object.keys(SCENARIOS).map((s) => (
          <button
            key={s}
            onClick={() => setScenario(s)}
            aria-pressed={scenario === s}
            className={`min-h-11 rounded-[10px] border-[1.5px] px-4 text-sm font-semibold transition active:scale-[.97] ${scenario === s ? 'border-ink bg-ink text-white' : 'border-line bg-white hover:border-ink'}`}
          >
            {s}
          </button>
        ))}
      </div>
      <FolderTabs label="Member" tabs={members.map((m) => ({ value: m.id, label: m.name, color: m.color }))} value={memberId} onChange={setPicked} />

      {error && <p role="alert" className="text-sm text-danger">{error}</p>}
      {items === null ? (
        <p className="label">Loading…</p>
      ) : (
        <>
          <div className="card space-y-2.5 p-4">
            <div className="flex items-baseline justify-between gap-3">
              <p className="label">{scenario}</p>
              <p className="font-mono text-sm font-semibold uppercase">{ready} of {items.length} ready</p>
            </div>
            <div role="progressbar" aria-label="Documents ready" aria-valuemin={0} aria-valuemax={items.length} aria-valuenow={ready} className="h-2 overflow-hidden rounded-full bg-paper">
              <div className="h-2 rounded-full bg-ink transition-[width] duration-500" style={{ width: `${(ready / items.length) * 100}%` }} />
            </div>
          </div>
          <ul className="space-y-2.5">
            {items.map(({ type, status }, i) => {
              const [text, color] = STAMP[status]
              return (
                <li key={type} className="rise card flex items-center justify-between gap-3 px-4 py-3.5" style={{ animationDelay: `${i * 60}ms` }}>
                  <span className="font-semibold">{type}</span>
                  <span className={`stamp ${color}`} style={{ animationDelay: `${i * 60 + 250}ms` }}>{text}</span>
                </li>
              )
            })}
          </ul>
        </>
      )}
    </div>
  )
}
