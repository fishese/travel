import { useSetting } from './useSetting'
import { localDateStr, localTomorrowStr } from './dateUtils'
import type { SavedFlight } from './flights'
import type { SavedHotel } from './hotels'
import type { Booking } from './bookings'
import { CATEGORY_EMOJI } from './bookings'

export interface ReminderItem {
  id: string // stable per item+date, used as the dismiss key too
  date: string
  time?: string
  emoji: string
  title: string
  subtitle?: string
  kind: 'flight' | 'hotel-checkin' | 'booking'
}

function todayStr(): string {
  return localDateStr()
}
function tomorrowStr(): string {
  return localTomorrowStr()
}

export interface NextUpcoming {
  date: string
  items: ReminderItem[]
}

export function buildReminders(
  flights: SavedFlight[],
  hotels: SavedHotel[],
  bookings: Booking[],
): { today: ReminderItem[]; tomorrow: ReminderItem[]; next: NextUpcoming | null } {
  const today = todayStr()
  const tomorrow = tomorrowStr()
  const items: ReminderItem[] = []

  // Built for anything from today onward, not just today/tomorrow — the
  // dashboard's "Coming up" fallback (see ReminderFeed) needs to know
  // about everything further out too, so it can point at the single
  // nearest date when nothing is imminent yet.
  for (const f of flights) {
    if (f.date >= today) {
      items.push({
        id: `flight:${f.id}|${f.date}`,
        date: f.date,
        time: f.departureTime,
        emoji: '✈️',
        title: f.flightIata,
        subtitle: f.origin && f.destination ? `${f.origin} → ${f.destination}` : f.notes,
        kind: 'flight',
      })
    }
  }

  for (const h of hotels) {
    if (h.checkIn && h.checkIn >= today) {
      items.push({
        id: `hotel:${h.id}|${h.checkIn}`,
        date: h.checkIn,
        emoji: '🏨',
        title: h.name,
        subtitle: ['Check-in', h.address].filter(Boolean).join(' · '),
        kind: 'hotel-checkin',
      })
    }
  }

  for (const b of bookings) {
    if (b.date >= today) {
      items.push({
        id: `booking:${b.id}|${b.date}`,
        date: b.date,
        time: b.time,
        emoji: CATEGORY_EMOJI[b.category],
        title: b.label,
        subtitle: b.notes,
        kind: 'booking',
      })
    }
  }

  const forDate = (date: string) =>
    items.filter((i) => i.date === date).sort((a, b) => (a.time ?? '99:99').localeCompare(b.time ?? '99:99'))

  const futureDates = [...new Set(items.map((i) => i.date))].filter((d) => d > tomorrow).sort()
  const nextDate = futureDates[0]
  const next = nextDate ? { date: nextDate, items: forDate(nextDate) } : null

  return { today: forDate(today), tomorrow: forDate(tomorrow), next }
}

/** Dismissed reminders persist (so reopening the app the same day doesn't
 * bring back something already seen) but self-prune: each item's dismiss
 * key embeds its own date, so a stale entry for a date before today is
 * simply dropped on next write rather than needing a separate cleanup job. */
// Stable module-level reference — see useSetting.ts's header comment for
// why a fresh `[]` literal here would defeat the setter/getSnapshot
// memoization on every render.
const EMPTY_DISMISSED: string[] = []

export function useDismissedReminders() {
  const [dismissed, setDismissed] = useSetting<string[]>('travel_dismissed_reminders', EMPTY_DISMISSED)

  function isDismissed(id: string): boolean {
    return dismissed.includes(id)
  }

  function dismiss(id: string) {
    setDismissed((prev) => {
      const today = todayStr()
      const pruned = prev.filter((key) => {
        const datePart = key.split('|')[1]
        return !datePart || datePart >= today
      })
      return pruned.includes(id) ? pruned : [...pruned, id]
    })
  }

  return { isDismissed, dismiss }
}
