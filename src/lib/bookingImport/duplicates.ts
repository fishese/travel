import type { SavedFlight } from '../flights'
import type { SavedHotel } from '../hotels'
import type { Booking } from '../bookings'

function normalized(value: string): string {
  return value.normalize('NFKC').trim().toLocaleLowerCase().replace(/\s+/g, ' ')
}

export function flightIdentity(record: Pick<SavedFlight, 'flightIata' | 'date'>): string {
  return JSON.stringify([record.flightIata.toUpperCase().replace(/\s+/g, ''), record.date])
}

export function hotelIdentity(record: Pick<SavedHotel, 'name' | 'checkIn'>): string {
  return JSON.stringify([normalized(record.name), record.checkIn ?? ''])
}

export function bookingIdentity(record: Pick<Booking, 'category' | 'label' | 'date'>): string {
  return JSON.stringify([record.category, normalized(record.label), record.date])
}

/** Recomputed from edited rows and live storage, including duplicates within a batch. */
export function duplicateFlags<T>(rows: readonly T[], existing: readonly T[], identity: (record: T) => string): boolean[] {
  const seen = new Set(existing.map(identity))
  return rows.map((row) => {
    const key = identity(row)
    const duplicate = seen.has(key)
    seen.add(key)
    return duplicate
  })
}
