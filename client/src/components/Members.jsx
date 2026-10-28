// Lists family members and adds new ones (POST /api/members).
import { useState } from 'react'
import { api } from '../lib/api.js'

const input = 'w-full rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500'

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
      <form onSubmit={handleSubmit} className="grid gap-3 rounded-2xl bg-white p-4 shadow sm:grid-cols-4 sm:items-end">
        <label className="space-y-1">
          <span className="text-sm text-slate-700">Name</span>
          <input className={input} required value={form.name} onChange={set('name')} />
        </label>
        <label className="space-y-1">
          <span className="text-sm text-slate-700">Relation</span>
          <input className={input} value={form.relation} onChange={set('relation')} placeholder="Mother, Son…" />
        </label>
        <label className="space-y-1">
          <span className="text-sm text-slate-700">Date of birth</span>
          <input className={input} type="date" value={form.dob} onChange={set('dob')} />
        </label>
        <button disabled={busy} className="rounded-lg bg-indigo-600 py-2 font-medium text-white hover:bg-indigo-700 disabled:opacity-50">
          {busy ? 'Adding…' : 'Add member'}
        </button>
        {error && <p role="alert" className="text-sm text-red-600 sm:col-span-4">{error}</p>}
      </form>

      {members.length === 0 ? (
        <p className="text-slate-500">No members yet. Add yourself first.</p>
      ) : (
        <ul className="divide-y divide-slate-200 rounded-2xl bg-white shadow">
          {members.map((m) => (
            <li key={m.id} className="flex justify-between px-4 py-3">
              <span className="font-medium text-slate-800">{m.name}</span>
              <span className="text-sm text-slate-500">{[m.relation, m.dob].filter(Boolean).join(' · ')}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
