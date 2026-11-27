// Run with `npm test`. Checks that "today" is the device's calendar day, not the UTC day.
import { test, mock } from 'node:test'
import assert from 'node:assert/strict'

process.env.TZ = 'Asia/Kolkata'

test('02:00 in India on 25 Nov is 25 Nov (the UTC date is still 24 Nov)', async () => {
  mock.timers.enable({ apis: ['Date'], now: Date.UTC(2026, 10, 24, 20, 30) })
  const { today, daysLeft } = await import('./dates.js')
  assert.equal(today(), '2026-11-25')
  assert.equal(daysLeft('2026-11-26'), 1)
  assert.equal(daysLeft('2026-11-25'), 0)
  assert.equal(daysLeft('2026-11-24'), -1)
  mock.timers.reset()
})
