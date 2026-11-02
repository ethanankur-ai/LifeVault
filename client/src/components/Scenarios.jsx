// Scenario checklists: for one member and one situation, shows which required documents are
// ready, expired or missing. Built-in checklists come from docTypes.js, the family's own from
// GET /api/checklists. Reuses GET /api/documents?member=; the matching happens here.
import { useEffect, useState } from 'react'
import { api } from '../lib/api.js'
import { SCENARIOS } from '../lib/docTypes.js'
import { today } from '../lib/dates.js'
import FolderTabs from './FolderTabs.jsx'
import ChecklistBuilder from './ChecklistBuilder.jsx'

const BUILT_IN = Object.entries(SCENARIOS).map(([name, doc_types]) => ({ key: name, name, doc_types }))

// Rubber-stamp text and colour per checklist status.
const STAMP = {
  ready: ['Ready', 'border-ok text-ok'],
  expired: ['Expired', 'border-warn text-warn'],
  missing: ['Missing', 'border-danger text-danger'],
}

export default function Scenarios({ members, types, onAdd, onTypesChange }) {
  const [picked, setPicked] = useState('')
  const [scenario, setScenario] = useState(BUILT_IN[0].key) // a built-in name or a custom checklist id
  const [custom, setCustom] = useState([]) // the family's own checklists
  const [building, setBuilding] = useState(false)
  const [loaded, setLoaded] = useState({ memberId: null, docs: [] })
  const [error, setError] = useState('')

  // Defaults to the first member, even if the member list arrives after this tab opened.
  const memberId = picked || members[0]?.id

  useEffect(() => {
    api('/api/checklists').then(setCustom).catch((err) => setError(err.message))
  }, [])

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

  const all = [...BUILT_IN, ...custom.map((c) => ({ key: c.id, id: c.id, name: c.name, doc_types: c.doc_types }))]
  // Falls back to the first checklist if the selected one was just deleted.
  const current = all.find((c) => c.key === scenario) ?? all[0]

  // Ready = at least one copy that hasn't expired. Documents without an expiry date never expire.
  const status = (type) => {
    const ofType = docs.filter((d) => d.doc_type?.toLowerCase() === type.toLowerCase())
    if (ofType.length === 0) return 'missing'
    return ofType.some((d) => !d.expiry_date || d.expiry_date >= today) ? 'ready' : 'expired'
  }
  const items = docs && current.doc_types.map((type) => ({ type, status: status(type) }))
  const ready = items?.filter((i) => i.status === 'ready').length
  const memberName = members.find((m) => m.id === memberId)?.name

  async function handleDelete() {
    if (!window.confirm(`Delete the "${current.name}" checklist?`)) return
    try {
      await api(`/api/checklists/${current.id}`, { method: 'DELETE' })
      setCustom(custom.filter((c) => c.id !== current.id))
      onTypesChange() // its new categories may no longer be used anywhere
    } catch (err) {
      setError(err.message)
    }
  }

  const chip = (on) => `min-h-11 rounded-[10px] border-[1.5px] px-4 text-sm font-semibold transition active:scale-[.97] ${on ? 'border-ink bg-ink text-white' : 'border-line bg-white hover:border-ink'}`

  return (
    <div className="space-y-4">
      <div role="group" aria-label="Situation" className="flex flex-wrap gap-2">
        {all.map((c) => (
          <button key={c.key} onClick={() => { setScenario(c.key); setBuilding(false) }} aria-pressed={!building && current.key === c.key} className={chip(!building && current.key === c.key)}>
            {c.name}
          </button>
        ))}
        <button onClick={() => setBuilding(true)} aria-pressed={building} className={`${chip(building)} border-dashed`}>
          + New checklist
        </button>
      </div>

      {building ? (
        <ChecklistBuilder
          types={types}
          onCancel={() => setBuilding(false)}
          onSaved={(c) => {
            setCustom([...custom, c])
            setScenario(c.id)
            setBuilding(false)
            onTypesChange() // the checklist may have added new categories
          }}
        />
      ) : (
        <>
          <FolderTabs label="Member" tabs={members.map((m) => ({ value: m.id, label: m.name, color: m.color }))} value={memberId} onChange={setPicked} />

          {error && <p role="alert" className="text-sm text-danger">{error}</p>}
          {items === null ? (
            <p className="label">Loading…</p>
          ) : (
            <>
              <div className="card space-y-2.5 p-4">
                <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                  <p className="label">{current.name}</p>
                  <p className="font-mono text-sm font-semibold uppercase">{ready} of {items.length} ready</p>
                </div>
                <div role="progressbar" aria-label="Documents ready" aria-valuemin={0} aria-valuemax={items.length} aria-valuenow={ready} className="h-2 overflow-hidden rounded-full bg-paper">
                  <div className="h-2 rounded-full bg-ink transition-[width] duration-500" style={{ width: `${(ready / items.length) * 100}%` }} />
                </div>
                {current.id && (
                  <button type="button" onClick={handleDelete} className="min-h-11 text-sm font-semibold text-danger hover:underline">
                    Delete this checklist
                  </button>
                )}
              </div>
              <ul className="space-y-2.5">
                {items.map(({ type, status }, i) => {
                  const [text, color] = STAMP[status]
                  return (
                    <li key={type} className="rise card flex items-center justify-between gap-3 px-4 py-3.5" style={{ animationDelay: `${i * 60}ms` }}>
                      <span className="font-semibold">{type}</span>
                      <div className="flex items-center gap-3">
                        <span className={`stamp ${color}`} style={{ animationDelay: `${i * 60 + 250}ms` }}>{text}</span>
                        {status !== 'ready' && (
                          <button
                            type="button"
                            onClick={() => onAdd({ member_id: memberId, doc_type: type })}
                            aria-label={`Add ${type} for ${memberName}`}
                            className="btn-ghost h-10 px-3 text-sm"
                          >
                            Add
                          </button>
                        )}
                      </div>
                    </li>
                  )
                })}
              </ul>
            </>
          )}
        </>
      )}
    </div>
  )
}
