// Date helpers. Dates are "YYYY-MM-DD" strings, the format Postgres date columns use.
const MS_PER_DAY = 24 * 60 * 60 * 1000

// Today's calendar day on THIS device, as "YYYY-MM-DD". Not toISOString(): that is the UTC day, which
// in India is still "yesterday" from midnight until 05:30. Called each time (not saved at load), so a tab
// left open past midnight stays correct.
export function today() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// Both dates as UTC midnight, so the difference is a whole number of days (negative = past).
export const daysLeft = (date) => Math.round((Date.parse(date) - Date.parse(today())) / MS_PER_DAY)
