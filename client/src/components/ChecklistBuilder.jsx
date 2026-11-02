// "New checklist" panel: describe a situation, let AI draft the document list (POST /api/checklists/suggest),
// edit it, then save it (POST /api/checklists). Types not in the list yet become new custom categories.
import { useState } from 'react'
import { api } from '../lib/api.js'

export default function ChecklistBuilder({ types, onSaved, onCancel }) {
  const [situation, setSituation] = useState('')
  const [name, setName] = useState('')
  const [list, setList] = useState([])
  const [adding, setAdding] = useState('')
  const [asking, setAsking] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const isKnown = (t) => types.some((k) => k.toLowerCase() === t.toLowerCase())

  async function handleAsk(e) {
    e.preventDefault()
    setAsking(true)
    setError('')
    try {
      const draft = await api('/api/checklists/suggest', { method: 'POST', body: { situation } })
      setName(draft.name)
      setList(draft.doc_types)
      if (draft.doc_types.length === 0) setError("AI couldn't suggest documents right now. Add them yourself below.")
    } catch (err) {
      setError(err.message)
    }
    setAsking(false)
  }

  function addType() {
    const typed = adding.trim()
    if (!typed) return
    // Reuse the existing spelling ("passport" → "Passport") so it matches documents later.
    const t = types.find((k) => k.toLowerCase() === typed.toLowerCase()) ?? typed
    if (!list.some((x) => x.toLowerCase() === t.toLowerCase())) setList([...list, t])
    setAdding('')
  }

  async function handleSave(e) {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      onSaved(await api('/api/checklists', { method: 'POST', body: { name, doc_types: list } }))
    } catch (err) {
      setError(err.message)
      setBusy(false)
    }
  }

  return (
    <section aria-labelledby="new-checklist" className="rise card space-y-5 p-4 sm:p-5">
      <h2 id="new-checklist" className="text-lg font-semibold">New checklist</h2>

      {/* Separate form, so Enter here asks AI instead of saving. */}
      <form onSubmit={handleAsk} className="space-y-1.5">
        <label htmlFor="situation" className="label">What is it for?</label>
        <div className="flex flex-wrap gap-2">
          <input
            id="situation"
            className="field min-w-0 flex-1 basis-56"
            required
            maxLength={200}
            placeholder="e.g. UK tourist visa for my son"
            value={situation}
            onChange={(e) => setSituation(e.target.value)}
          />
          <button disabled={asking || !situation.trim()} className="btn-ghost h-12 border-accent text-accent">
            <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l1.8 4.7 4.7 1.8-4.7 1.8L12 16l-1.8-4.7-4.7-1.8 4.7-1.8z" /><path d="M19 15l.8 2.2 2.2.8-2.2.8L19 21l-.8-2.2-2.2-.8 2.2-.8z" /></svg>
            {asking ? 'Thinking…' : 'Ask AI'}
          </button>
        </div>
      </form>

      <form onSubmit={handleSave} className="space-y-4">
        <label className="block space-y-1.5">
          <span className="label">Checklist name</span>
          <input className="field" required maxLength={60} value={name} onChange={(e) => setName(e.target.value)} placeholder="UK visa" />
        </label>

        <div className="space-y-2">
          <p className="label">Documents needed</p>
          {list.length === 0 ? (
            <p className="text-sm text-muted">None yet. Ask AI above, or add them yourself.</p>
          ) : (
            <ul className="flex flex-wrap gap-2">
              {list.map((t) => (
                <li key={t} className="inline-flex h-11 items-center gap-2 rounded-[10px] bg-paper pl-3 text-sm font-medium">
                  {t}
                  {!isKnown(t) && <span className="font-mono text-[10px] font-semibold tracking-wider text-accent uppercase">New</span>}
                  <button
                    type="button"
                    aria-label={`Remove ${t}`}
                    onClick={() => setList(list.filter((x) => x !== t))}
                    className="grid size-11 place-items-center rounded-[10px] text-muted transition hover:bg-line hover:text-ink"
                  >
                    <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M7 7l10 10M17 7L7 17" /></svg>
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div className="flex gap-2">
            <label htmlFor="add-type" className="sr-only">Add a document type</label>
            <input
              id="add-type"
              className="field min-w-0"
              list="checklist-type-options"
              placeholder="Add a type, or type a new category"
              value={adding}
              onChange={(e) => setAdding(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault() // add the type instead of submitting the checklist
                  addType()
                }
              }}
            />
            <datalist id="checklist-type-options">
              {types.map((t) => <option key={t} value={t} />)}
            </datalist>
            <button type="button" onClick={addType} disabled={!adding.trim()} className="btn-ghost h-12 shrink-0">Add</button>
          </div>
        </div>

        {error && <p role="alert" className="text-sm text-danger">{error}</p>}
        <div className="flex gap-2">
          <button disabled={busy || !name.trim() || list.length === 0} className="btn flex-1">{busy ? 'Saving…' : 'Save checklist'}</button>
          <button type="button" onClick={onCancel} className="btn-ghost h-12">Cancel</button>
        </div>
      </form>
    </section>
  )
}
