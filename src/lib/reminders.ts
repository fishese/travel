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

export function buildReminders(
  flights: SavedFlight[],
  hotels: SavedHotel[],
  bookings: Booking[],
): { today: ReminderItem[]; tomorrow: ReminderItem[] } {
  const today = todayStr()
  const tomorrow = tomorrowStr()
  const items: ReminderItem[] = []

  for (const f of flights) {
    if (f.date === today || f.date === tomorrow) {
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
    if (h.checkIn === today || h.checkIn === tomorrow) {
      items.push({
        id: `hotel:${h.id}|${h.checkIn}`,
        date: h.checkIn!,
        emoji: '🏨',
        title: h.name,
        subtitle: ['Check-in', h.address].filter(Boolean).join(' · '),
        kind: 'hotel-checkin',
      })
    }
  }

  for (const b of bookings) {
    if (b.date === today || b.date === tomorrow) {
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

  return { today: forDate(today), tomorrow: forDate(tomorrow) }
}

/** Dismissed reminders persist (so reopening the app the same day doesn't
 * bring back something already seen) but self-prune: each item's dismiss
 * key embeds its own date, so a stale entry for a date before today is
 * simply dropped on next write rather than needing a separate cleanup job. */
export function useDismissedReminders() {
  const [dismissed, setDismissed] = useSetting<string[]>('travel_dismissed_reminders', [])

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
