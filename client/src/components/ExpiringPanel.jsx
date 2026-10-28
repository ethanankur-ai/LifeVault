// "Expiring soon" alert: documents expiring in the next 60 days (GET /api/documents/expiring).
import { useEffect, useState } from 'react'
import { api } from '../lib/api.js'

const MS_PER_DAY = 24 * 60 * 60 * 1000
// Both dates as UTC midnight, so the difference is a whole number of days.
const daysLeft = (date) => Math.round((Date.parse(date) - Date.parse(new Date().toISOString().slice(0, 10))) / MS_PER_DAY)

export default function ExpiringPanel({ members }) {
  const [docs, setDocs] = useState([])

  useEffect(() => {
    // Silent on failure: the document list below shows any API error.
    api('/api/documents/expiring').then(setDocs).catch(() => {})
  }, [])

  if (docs.length === 0) return null
  const memberName = Object.fromEntries(members.map((m) => [m.id, m.name]))

  return (
    <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
      <h2 className="font-semibold text-amber-900">⏰ Expiring soon</h2>
      <ul className="mt-2 space-y-1 text-sm text-amber-900">
        {docs.map((d) => {
          const days = daysLeft(d.expiry_date)
          return (
            <li key={d.id} className="flex justify-between gap-3">
              <span>{d.doc_type || 'Document'} · {memberName[d.member_id] ?? 'Unknown'}</span>
              <span className="shrink-0 font-medium">{days === 0 ? 'today' : `in ${days} day${days === 1 ? '' : 's'}`}</span>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
