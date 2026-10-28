// "Renew soon" note: documents expiring in the next 60 days (GET /api/documents/expiring).
import { useEffect, useState } from 'react'
import { api } from '../lib/api.js'
import { daysLeft } from '../lib/dates.js'

export default function ExpiringPanel({ members }) {
  const [docs, setDocs] = useState([])

  useEffect(() => {
    // Silent on failure: the document list below shows any API error.
    api('/api/documents/expiring').then(setDocs).catch(() => {})
  }, [])

  if (docs.length === 0) return null
  const memberName = Object.fromEntries(members.map((m) => [m.id, m.name]))

  return (
    <section aria-labelledby="renew-soon" className="slip relative rounded bg-slip px-4 pt-4 pb-2 shadow-[0_10px_22px_-16px_rgba(27,31,36,.5)]">
      {/* Paper clip holding the note. */}
      <svg aria-hidden="true" className="absolute -top-3 right-5" width="22" height="34" viewBox="0 0 22 34" fill="none" stroke="#6B7280" strokeWidth="2" strokeLinecap="round"><path d="M15 9v15a5 5 0 0 1-10 0V7a3.5 3.5 0 0 1 7 0v16a1.8 1.8 0 0 1-3.6 0V10" /></svg>
      <h2 id="renew-soon" className="font-mono text-xs font-semibold tracking-[0.14em] text-[#5C4400] uppercase">Renew soon</h2>
      <ul className="divide-y divide-dashed divide-[#C9B45C]">
        {docs.map((d) => {
          const days = daysLeft(d.expiry_date)
          return (
            <li key={d.id} className="flex justify-between gap-3 py-2 text-[15px] text-[#3D2E00]">
              <span>{d.doc_type || 'Document'} · {memberName[d.member_id] ?? 'Unknown'}</span>
              <span className="shrink-0 font-mono text-sm font-semibold uppercase">{days === 0 ? 'Today' : `${days} day${days === 1 ? '' : 's'}`}</span>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
