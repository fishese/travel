/**
 * YYYY-MM-DD in the browser's LOCAL timezone.
 *
 * NOT `date.toISOString().slice(0, 10)` — that's UTC, which silently shifts
 * by a day during early-morning hours in any positive-UTC-offset timezone.
 * Hong Kong (UTC+8) hits this every single day between midnight and 8am
 * local time: "today" would still compute as yesterday's date. This bit
 * flight-status day-of-departure checks, the reminder feed's today/tomorrow
 * split, quota month rollover, and both date-entry forms' defaults — all
 * fixed by routing through this instead.
 */
export function localDateStr(date: Date = new Date()): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function localTomorrowStr(date: Date = new Date()): string {
  const tomorrow = new Date(date)
  tomorrow.setDate(tomorrow.getDate() + 1)
  return localDateStr(tomorrow)
}

export function localMonthStr(date: Date = new Date()): string {
  return localDateStr(date).slice(0, 7)
}
