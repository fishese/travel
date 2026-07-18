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

/**
 * Formats a YYYY-MM-DD string for display, e.g. "Tue, Aug 25". Parsed via
 * the Date(year, month, day) constructor — which reads its components as
 * LOCAL time — rather than `new Date(dateStr)`, which parses an ISO date
 * string as UTC and is exactly the kind of off-by-one-day bug this file's
 * other functions already exist to avoid. The year is only included when
 * it isn't the current one, since "Tue, Aug 25, 2026" is more than a
 * booking three weeks out needs, but matters for one a year away.
 */
export function formatFriendlyDate(dateStr: string, today: string = localDateStr()): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  const sameYear = dateStr.slice(0, 4) === today.slice(0, 4)
  return date.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: sameYear ? undefined : 'numeric',
  })
}
