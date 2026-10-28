// Search + filter documents (GET /api/documents) and open each file through a signed Storage link.
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { api } from '../lib/api.js'
import { DOC_TYPES } from '../lib/docTypes.js'

const input = 'w-full rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500'
const today = new Date().toISOString().slice(0, 10)

export default function DocumentList({ members }) {
  const [q, setQ] = useState('')
  const [member, setMember] = useState('')
  const [type, setType] = useState('')
  const [docs, setDocs] = useState(null) // null = loading
  const [links, setLinks] = useState({}) // file_path → signed URL
  const [error, setError] = useState('')

  useEffect(() => {
    // Typing fires a request per keystroke; "ignore" drops answers that arrive after a newer one.
    let ignore = false
    const params = new URLSearchParams({ q, member, type })
    api(`/api/documents?${params}`)
      .then(async (rows) => {
        if (ignore) return
        setDocs(rows)
        setError('')
        if (rows.length === 0) return
        // The bucket is private: these links work for 1 hour, and only for this family's files.
        const { data } = await supabase.storage.from('documents').createSignedUrls(rows.map((d) => d.file_path), 3600)
        if (!ignore && data) setLinks(Object.fromEntries(data.map((l) => [l.path, l.signedUrl])))
      })
      .catch((err) => !ignore && setError(err.message))
    return () => { ignore = true }
  }, [q, member, type])

  const memberName = Object.fromEntries(members.map((m) => [m.id, m.name]))

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <input className={input} type="search" aria-label="Search" placeholder="Search type, number, tags…" value={q} onChange={(e) => setQ(e.target.value)} />
        <select className={input} aria-label="Member" value={member} onChange={(e) => setMember(e.target.value)}>
          <option value="">All members</option>
          {members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
        <select className={input} aria-label="Document type" value={type} onChange={(e) => setType(e.target.value)}>
          <option value="">All types</option>
          {DOC_TYPES.map((t) => <option key={t}>{t}</option>)}
        </select>
      </div>

      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
      {docs === null ? (
        <p className="text-slate-500">Loading…</p>
      ) : docs.length === 0 ? (
        <p className="text-slate-500">No documents found.</p>
      ) : (
        <ul className="divide-y divide-slate-200 rounded-2xl bg-white shadow">
          {docs.map((d) => (
            <li key={d.id} className="flex items-start justify-between gap-3 px-4 py-3">
              <div className="min-w-0 space-y-1">
                <p className="font-medium text-slate-800">
                  {d.doc_type || 'Document'} <span className="font-normal text-slate-500">· {memberName[d.member_id] ?? 'Unknown'}</span>
                </p>
                <p className="break-all text-sm text-slate-600">{d.doc_number || 'No number'}</p>
                <div className="flex flex-wrap gap-1 text-xs">
                  {d.expiry_date && (
                    <span className={`rounded px-2 py-0.5 ${d.expiry_date < today ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-600'}`}>
                      {d.expiry_date < today ? 'Expired' : 'Expires'} {d.expiry_date}
                    </span>
                  )}
                  {d.tags.map((t) => <span key={t} className="rounded bg-indigo-50 px-2 py-0.5 text-indigo-700">{t}</span>)}
                </div>
              </div>
              {links[d.file_path] && (
                <a href={links[d.file_path]} target="_blank" rel="noreferrer" className="shrink-0 rounded-lg border border-slate-300 px-3 py-1 text-sm hover:bg-slate-100">
                  Open
                </a>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
