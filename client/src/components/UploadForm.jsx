// Upload a document: the file goes straight to Supabase Storage, then its details go to POST /api/documents.
import { useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { api } from '../lib/api.js'
import { DOC_TYPES } from '../lib/docTypes.js'

const EMPTY = { member_id: '', doc_type: '', doc_number: '', expiry_date: '', tags: '' }

export default function UploadForm({ members, onSaved }) {
  const [file, setFile] = useState(null)
  const [form, setForm] = useState(EMPTY)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const [filling, setFilling] = useState(false)
  const [noExpiry, setNoExpiry] = useState(false)

  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value })

  // Sends the photo to POST /api/extract (Gemini). The server returns "" for anything it couldn't
  // read, so we only overwrite fields that came back filled in.
  async function handleAutoFill() {
    setFilling(true)
    setError('')
    try {
      // shortcut: sends the full-size photo; downscale with a canvas if large phone photos hit the 10mb body limit.
      const image = await new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result) // "data:image/jpeg;base64,..."
        reader.onerror = reject
        reader.readAsDataURL(file)
      })
      const found = await api('/api/extract', { method: 'POST', body: { image } })
      // A date input only accepts YYYY-MM-DD; anything else would be invisible but still sent on save.
      // "No expiry" ticked by the user wins over whatever Gemini thinks it read.
      if (noExpiry || !/^\d{4}-\d{2}-\d{2}$/.test(found.expiry_date)) found.expiry_date = ''
      const filled = Object.fromEntries(
        ['doc_type', 'doc_number', 'expiry_date'].filter((k) => found[k]).map((k) => [k, found[k]]),
      )
      setForm((f) => ({ ...f, ...filled }))
      if (Object.keys(filled).length === 0) setError("Auto-fill couldn't read this image. Please type the details.")
    } catch (err) {
      setError(err.message)
    }
    setFilling(false)
  }

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
      setNoExpiry(false)
      setFile(null)
      e.target.reset() // clears the file input, which React doesn't control
      onSaved()
    } catch (err) {
      setError(err.message)
    }
    setBusy(false)
  }

  if (members.length === 0) return <p className="text-muted">Add a family member first, then upload their documents.</p>

  return (
    <form onSubmit={handleSubmit} className="card grid gap-4 p-4 sm:grid-cols-2 sm:p-5">
      <label className="space-y-1.5 sm:col-span-2">
        <span className="label">File (photo or PDF)</span>
        <input
          className="field h-auto py-2.5 file:mr-3 file:rounded-md file:border-0 file:bg-paper file:px-3 file:py-1.5 file:font-mono file:text-xs file:font-semibold file:uppercase"
          type="file"
          required
          accept="image/*,application/pdf"
          onChange={(e) => setFile(e.target.files[0] ?? null)}
        />
      </label>
      {/* Gemini reads images only, so PDFs are filled in by hand. */}
      {file?.type.startsWith('image/') && (
        <button type="button" onClick={handleAutoFill} disabled={filling} className="btn-ghost border-accent text-accent sm:col-span-2">
          <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l1.8 4.7 4.7 1.8-4.7 1.8L12 16l-1.8-4.7-4.7-1.8 4.7-1.8z" /><path d="M19 15l.8 2.2 2.2.8-2.2.8L19 21l-.8-2.2-2.2-.8 2.2-.8z" /></svg>
          {filling ? 'Reading document…' : 'Auto-fill with AI'}
        </button>
      )}
      <label className="space-y-1.5">
        <span className="label">Family member</span>
        <select className="field" required value={form.member_id} onChange={set('member_id')}>
          <option value="">Choose…</option>
          {members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
      </label>
      <label className="space-y-1.5">
        <span className="label">Document type</span>
        <select className="field" required value={form.doc_type} onChange={set('doc_type')}>
          <option value="">Choose…</option>
          {DOC_TYPES.map((t) => <option key={t}>{t}</option>)}
        </select>
      </label>
      <label className="space-y-1.5">
        <span className="label">Document number</span>
        <input className="field font-mono" value={form.doc_number} onChange={set('doc_number')} />
      </label>
      <div className="space-y-1.5">
        <label htmlFor="expiry_date" className="label">Expiry date</label>
        <input id="expiry_date" className="field" type="date" disabled={noExpiry} value={form.expiry_date} onChange={set('expiry_date')} />
        <label className="flex min-h-11 cursor-pointer items-center gap-2.5 text-sm text-muted">
          <input
            type="checkbox"
            className="size-5 accent-ink"
            checked={noExpiry}
            onChange={(e) => {
              setNoExpiry(e.target.checked)
              if (e.target.checked) setForm({ ...form, expiry_date: '' }) // saved as null
            }}
          />
          No expiry date (Aadhaar, birth certificate…)
        </label>
      </div>
      <label className="space-y-1.5 sm:col-span-2">
        <span className="label">Tags (comma separated)</span>
        <input className="field" value={form.tags} onChange={set('tags')} placeholder="original, travel" />
      </label>

      {error && <p role="alert" className="text-sm text-danger sm:col-span-2">{error}</p>}
      <button disabled={busy || !file} className="btn sm:col-span-2">
        {busy ? 'Saving…' : 'Save document'}
      </button>
    </form>
  )
}
