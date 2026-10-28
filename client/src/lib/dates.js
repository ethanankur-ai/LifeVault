// Date helpers. Dates are "YYYY-MM-DD" strings, the format Postgres date columns use.
const MS_PER_DAY = 24 * 60 * 60 * 1000

export const today = new Date().toISOString().slice(0, 10)

// Both dates as UTC midnight, so the difference is a whole number of days (negative = past).
export const daysLeft = (date) => Math.round((Date.parse(date) - Date.parse(today)) / MS_PER_DAY)
