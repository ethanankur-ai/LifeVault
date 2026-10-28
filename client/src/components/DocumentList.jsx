// Search + filter documents (GET /api/documents) and open each file through a signed Storage link.
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { api } from '../lib/api.js'
import { DOC_TYPES } from '../lib/docTypes.js'
import { daysLeft } from '../lib/dates.js'
import FolderTabs from './FolderTabs.jsx'

// Rubber-stamp text and colour for a document's expiry date.
function stampFor(date) {
  if (!date) return ['No expiry', 'border-muted text-muted']
  const days = daysLeft(date)
  if (days < 0) return ['Expired', 'border-danger text-danger']
  if (days === 0) return ['Expires today', 'border-danger text-danger']
  if (days <= 60) return [`Renew in ${days} day${days === 1 ? '' : 's'}`, 'border-warn text-warn']
  return [`Valid to ${date.slice(0, 4)}`, 'border-muted text-muted']
}

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

  const memberById = Object.fromEntries(members.map((m) => [m.id, m]))

  return (
    <div className="space-y-4">
      <div className="relative">
        <svg aria-hidden="true" className="pointer-events-none absolute top-3.5 left-3.5" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#4B5563" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></svg>
        <input className="field pl-11" type="search" aria-label="Search" placeholder="Search type, number or tag" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <FolderTabs
        label="Member"
        tabs={[{ value: '', label: 'All' }, ...members.map((m) => ({ value: m.id, label: m.name, color: m.color }))]}
        value={member}
        onChange={setMember}
      />
      <div className="flex items-center gap-3">
        <label htmlFor="type-filter" className="label">Type</label>
        <select id="type-filter" className="field" value={type} onChange={(e) => setType(e.target.value)}>
          <option value="">All types</option>
          {DOC_TYPES.map((t) => <option key={t}>{t}</option>)}
        </select>
      </div>

      {error && <p role="alert" className="text-sm text-danger">{error}</p>}
      {docs === null ? (
        <p className="label">Loading…</p>
      ) : docs.length === 0 ? (
        <p className="rounded-xl border-[1.5px] border-dashed border-line px-4 py-7 text-center text-muted">Nothing filed here yet.</p>
      ) : (
        <>
          <p className="label">{docs.length} {docs.length === 1 ? 'file' : 'files'}</p>
          <ul className="grid gap-3.5 sm:grid-cols-2">
            {docs.map((d, i) => {
              const m = memberById[d.member_id]
              const [stamp, stampColor] = stampFor(d.expiry_date)
              const delay = Math.min(i, 10) * 60 // stagger the first few cards, then stop waiting
              return (
                <li key={d.id} className="rise" style={{ animationDelay: `${delay}ms` }}>
                  <div className="inline-flex h-6 items-center rounded-t-[9px] px-3 font-mono text-[11px] font-semibold tracking-wider uppercase" style={{ background: m?.color ?? '#D5D9DF' }}>
                    {m?.name ?? 'Unknown'}
                  </div>
                  <div className="card space-y-1.5 rounded-tl-none p-3.5 transition hover:-translate-y-0.5">
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-[17px] font-semibold">{d.doc_type || 'Document'}</p>
                      <span className={`stamp mt-0.5 ${stampColor}`} style={{ animationDelay: `${delay + 300}ms` }}>{stamp}</span>
                    </div>
                    <p className="font-mono text-[13px] break-all text-muted">{d.doc_number || 'No number'}</p>
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex flex-wrap gap-2 font-mono text-xs text-accent">
                        {d.tags.map((t) => <span key={t}>#{t}</span>)}
                      </div>
                      {links[d.file_path] && (
                        <a
                          href={links[d.file_path]}
                          target="_blank"
                          rel="noreferrer"
                          aria-label={`Open ${d.doc_type || 'document'} for ${m?.name ?? 'unknown member'}`}
                          className="inline-flex h-11 shrink-0 items-center gap-1.5 rounded-[10px] px-3 font-semibold text-accent transition hover:bg-paper"
                        >
                          Open
                          <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
                        </a>
                      )}
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        </>
      )}
    </div>
  )
}
