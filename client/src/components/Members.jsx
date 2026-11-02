// Lists family members and adds new ones (POST /api/members).
import { useState } from 'react'
import { api } from '../lib/api.js'

export default function Members({ members, onChange }) {
  const [form, setForm] = useState({ name: '', relation: '', dob: '' })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value })

  async function handleSubmit(e) {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      await api('/api/members', { method: 'POST', body: form })
      setForm({ name: '', relation: '', dob: '' })
      onChange() // App reloads the list so every tab sees the new member
    } catch (err) {
      setError(err.message)
    }
    setBusy(false)
  }

  return (
    <div className="space-y-6">
      {members.length === 0 ? (
        <p className="rounded-xl border-[1.5px] border-dashed border-line px-4 py-7 text-center text-muted">No members yet. Add yourself first.</p>
      ) : (
        <ul className="card divide-y divide-paper overflow-hidden">
          {members.map((m, i) => (
            <li key={m.id} className="rise flex items-center gap-3 px-4 py-3" style={{ animationDelay: `${i * 50}ms` }}>
              {/* Same colour as this member's folder tabs elsewhere in the app. */}
              <span className="grid size-11 shrink-0 place-items-center rounded-[10px] font-mono text-sm font-semibold uppercase" style={{ background: m.color }}>
                {m.name.slice(0, 2)}
              </span>
              <div className="min-w-0">
                <p className="font-semibold">{m.name}</p>
                <p className="text-sm text-muted">
                  {m.relation || 'Family'}
                  {m.dob && <span className="font-mono"> · {m.dob}</span>}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={handleSubmit} className="card grid gap-4 p-4 sm:grid-cols-4 sm:items-end sm:p-5">
        <h2 className="label sm:col-span-4">Add a member</h2>
        <label className="space-y-1.5">
          <span className="label">Name</span>
          <input className="field" required value={form.name} onChange={set('name')} />
        </label>
        <label className="space-y-1.5">
          <span className="label">Relation</span>
          <input className="field" value={form.relation} onChange={set('relation')} placeholder="Mother, Son…" />
        </label>
        <label className="space-y-1.5">
          <span className="label">Date of birth</span>
          <input className="field" type="date" value={form.dob} onChange={set('dob')} />
        </label>
        <button disabled={busy} className="btn">
          {busy ? 'Adding…' : 'Add member'}
        </button>
        {error && <p role="alert" className="text-sm text-danger sm:col-span-4">{error}</p>}
      </form>
    </div>
  )
}
