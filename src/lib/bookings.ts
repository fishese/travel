import { useSetting } from './useSetting'

export type BookingCategory = 'flight' | 'train' | 'tour' | 'restaurant' | 'show' | 'other'

export const CATEGORY_EMOJI: Record<BookingCategory, string> = {
  flight: '✈️',
  train: '🚆',
  tour: '🧭',
  restaurant: '🍽️',
  show: '🎟️',
  other: '📌',
}

export const CATEGORY_LABELS: Record<BookingCategory, string> = {
  flight: 'Flight',
  train: 'Train',
  tour: 'Tour',
  restaurant: 'Restaurant',
  show: 'Show',
  other: 'Other',
}

export interface Booking {
  id: string
  date: string // YYYY-MM-DD
  time?: string // HH:mm, optional — used for sorting within a day
  category: BookingCategory
  label: string // freeform: "Hadestown 18:45 showing"
  notes?: string
  savedAt: string

  // Forward-looking, not used by anything yet: once paste/upload parsing
  // exists, entries created that way should be distinguishable from manual
  // ones, and the original text worth keeping around in case the parse was
  // wrong and needs a human to re-read the source. Manual entries always
  // have source: 'manual' and no rawText.
  source: 'manual' | 'pasted' | 'uploaded'
  rawText?: string
}

export function useSavedBookings() {
  return useSetting<Booking[]>('travel_bookings', [])
}

function makeId() {
  return Math.random().toString(36).slice(2, 9)
}

/**
 * Pure construction function, deliberately separate from any form UI —
 * a future paste/upload parser calls this with extracted fields exactly
 * the same way the manual "Add booking" form does, so wiring in parsing
 * later doesn't require touching this shape or any of the list/reminder
 * logic built on top of it.
 */
export function newBooking(fields: {
  date: string
  time?: string
  category: BookingCategory
  label: string
  notes?: string
  source?: Booking['source']
  rawText?: string
}): Booking {
  return {
    id: makeId(),
    date: fields.date,
    time: fields.time?.trim() || undefined,
    category: fields.category,
    label: fields.label.trim(),
    notes: fields.notes?.trim() || undefined,
    savedAt: new Date().toISOString(),
    source: fields.source ?? 'manual',
    rawText: fields.rawText,
  }
}
