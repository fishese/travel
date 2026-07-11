export function formatTimeInZone(timeZone: string, date = new Date()): string {
  return new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone,
  }).format(date)
}

/** Best-effort local timezone guess from the browser; falls back to home tz. */
export function guessLocalTimeZone(fallback: string): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || fallback
  } catch {
    return fallback
  }
}
