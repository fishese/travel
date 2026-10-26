import type { SavedFlight } from '../flights'
import type { SavedHotel } from '../hotels'
import type { Booking } from '../bookings'
import { writeSettingsExternally } from '../useSetting'
import { bookingIdentity, flightIdentity, hotelIdentity } from './duplicates'

/** Append only; read at commit time so concurrent edits are preserved. */
export function appendImportRecords(records: { flights: SavedFlight[]; hotels: SavedHotel[]; bookings: Booking[] }, activeTripId?: string, keepDuplicates = false) {
  const values: Record<string, unknown> = {}
  for (const kind of ['flights', 'hotels', 'bookings'] as const) {
    if (!records[kind].length) continue
    const key = `travel_${kind}`
    const current: unknown = JSON.parse(localStorage.getItem(key) ?? '[]')
    if (!Array.isArray(current)) throw new Error('Existing planner data could not be read. No records were replaced.')
    if (!keepDuplicates) {
      const identity = kind === 'flights' ? (row: unknown) => flightIdentity(row as SavedFlight)
        : kind === 'hotels' ? (row: unknown) => hotelIdentity(row as SavedHotel)
          : (row: unknown) => bookingIdentity(row as Booking)
      const seen = new Set(current.map(identity))
      for (const record of records[kind]) {
        const id = identity(record)
        if (seen.has(id)) throw new Error('Planner records changed or duplicates were found. Review the import again before saving.')
        seen.add(id)
      }
    }
    values[key] = [...current, ...records[kind]]
  }
  if (activeTripId !== undefined) values.travel_active_trip = activeTripId
  writeSettingsExternally(values)
}
