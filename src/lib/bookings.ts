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
  tripId?: string
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

// Stable module-level reference — see hotels.ts / useSetting.ts for why a
// fresh `[]` literal here would defeat the setter/getSnapshot memoization.
const EMPTY_BOOKINGS: Booking[] = []

export function useSavedBookings() {
  return useSetting<Booking[]>('travel_bookings', EMPTY_BOOKINGS)
}

function makeId() {
  return Math.random().toString(36).slice(2, 9)
}

export interface BookingFieldInput {
  tripId?: string
  date: string
  time?: string
  category: BookingCategory
  label: string
  notes?: string
}

function normalizeBookingFields(fields: BookingFieldInput) {
  return {
    date: fields.date,
    tripId: fields.tripId || undefined,
    time: fields.time?.trim() || undefined,
    category: fields.category,
    label: fields.label.trim(),
    notes: fields.notes?.trim() || undefined,
  }
}

/**
 * Pure construction function, deliberately separate from any form UI —
 * a future paste/upload parser calls this with extracted fields exactly
 * the same way the manual "Add booking" form does, so wiring in parsing
 * later doesn't require touching this shape or any of the list/reminder
 * logic built on top of it.
 */
export function newBooking(
  fields: BookingFieldInput & { source?: Booking['source']; rawText?: string },
): Booking {
  return {
    id: makeId(),
    ...normalizeBookingFields(fields),
    savedAt: new Date().toISOString(),
    source: fields.source ?? 'manual',
    rawText: fields.rawText,
  }
}

/** Applies an edit to an existing booking — same field normalization as
 * newBooking, but keeps id/savedAt/source/rawText untouched. The original
 * pasted text (if any) stays attached even after a manual edit, since
 * it's still useful as "here's what this looked like before I changed
 * it" if the edit itself turns out wrong. */
export function applyBookingEdit(booking: Booking, fields: BookingFieldInput): Booking {
  return { ...booking, ...normalizeBookingFields(fields) }
}
