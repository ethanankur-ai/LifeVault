// Upload a document: the file goes straight to Supabase Storage, then its details go to POST /api/documents.
import { useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { api } from '../lib/api.js'
import { DOC_TYPES } from '../lib/docTypes.js'

const input = 'w-full rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500'
const EMPTY = { member_id: '', doc_type: '', doc_number: '', expiry_date: '', tags: '' }

export default function UploadForm({ members, onSaved }) {
  const [file, setFile] = useState(null)
  const [form, setForm] = useState(EMPTY)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value })

  async function handleSubmit(e) {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      // The storage policy only allows writes into "<my family id>/...".
      const { data: family, error: famErr } = await supabase.from('families').select('id').single()
      if (famErr) throw famErr
      // Random name: avoids clashes and characters Storage rejects in real file names.
      const ext = file.name.includes('.') ? file.name.split('.').pop() : 'bin'
      const path = `${family.id}/${crypto.randomUUID()}.${ext}`

      const { error: upErr } = await supabase.storage.from('documents').upload(path, file)
      if (upErr) throw upErr

      try {
        await api('/api/documents', {
          method: 'POST',
          body: {
            ...form,
            file_path: path,
            tags: form.tags.split(',').map((t) => t.trim()).filter(Boolean),
          },
        })
      } catch (err) {
        // Don't leave an orphan file in Storage if saving the details failed.
        await supabase.storage.from('documents').remove([path])
        throw err
      }

      setForm(EMPTY)
      setFile(null)
      e.target.reset() // clears the file input, which React doesn't control
      onSaved()
    } catch (err) {
      setError(err.message)
    }
    setBusy(false)
  }

  if (members.length === 0) return <p className="text-slate-500">Add a family member first, then upload their documents.</p>

  return (
    <form onSubmit={handleSubmit} className="grid gap-3 rounded-2xl bg-white p-4 shadow sm:grid-cols-2">
      <label className="space-y-1 sm:col-span-2">
        <span className="text-sm text-slate-700">File (photo or PDF)</span>
        <input
          className={`${input} file:mr-3 file:rounded file:border-0 file:bg-indigo-50 file:px-3 file:py-1 file:text-indigo-700`}
          type="file"
          required
          accept="image/*,application/pdf"
          onChange={(e) => setFile(e.target.files[0] ?? null)}
        />
      </label>
      <label className="space-y-1">
        <span className="text-sm text-slate-700">Family member</span>
        <select className={input} required value={form.member_id} onChange={set('member_id')}>
          <option value="">Choose…</option>
          {members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
      </label>
      <label className="space-y-1">
        <span className="text-sm text-slate-700">Document type</span>
        <select className={input} required value={form.doc_type} onChange={set('doc_type')}>
          <option value="">Choose…</option>
          {DOC_TYPES.map((t) => <option key={t}>{t}</option>)}
        </select>
      </label>
      <label className="space-y-1">
        <span className="text-sm text-slate-700">Document number</span>
        <input className={input} value={form.doc_number} onChange={set('doc_number')} />
      </label>
      <label className="space-y-1">
        <span className="text-sm text-slate-700">Expiry date</span>
        <input className={input} type="date" value={form.expiry_date} onChange={set('expiry_date')} />
      </label>
      <label className="space-y-1 sm:col-span-2">
        <span className="text-sm text-slate-700">Tags (comma separated)</span>
        <input className={input} value={form.tags} onChange={set('tags')} placeholder="original, travel" />
      </label>

      {error && <p role="alert" className="text-sm text-red-600 sm:col-span-2">{error}</p>}
      <button disabled={busy || !file} className="rounded-lg bg-indigo-600 py-2 font-medium text-white hover:bg-indigo-700 disabled:opacity-50 sm:col-span-2">
        {busy ? 'Saving…' : 'Save document'}
      </button>
    </form>
  )
}
