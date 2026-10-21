import type { VaultCategory } from '../fileVault'
import type { DraftBooking, DraftFlight, DraftHotel, ParsedImport } from './types'

export type DocumentStorage = 'public' | 'vault'

/** Passports and payment details default to the locked vault. Ordinary
 * confirmations stay in the public booking area, which is readable without
 * the vault password. */
export function defaultDocumentStorage(preview: ParsedImport): DocumentStorage {
  return preview.suggestVault ? 'vault' : 'public'
}

/**
 * Public files must use the device-scoped `booking` category so they stay
 * readable without a vault password. Password-protected files use a vault
 * category. A train/tour/car confirmation has no vault category of its own;
 * `booking` is device-scoped, so a protected copy uses `other`.
 */
export function importFileCategory(preview: ParsedImport, storage: DocumentStorage): VaultCategory {
  if (storage === 'public') return 'booking'
  if (preview.sensitive.includes('passport')) return 'identity'
  if (preview.sensitive.includes('payment-card') || preview.sensitive.includes('security-code')) return 'other'
  const kinds = [preview.flights.length > 0, preview.hotels.length > 0, preview.bookings.length > 0].filter(Boolean).length
  if (kinds > 1) return 'other'
  if (preview.flights.length > 0 && preview.hotels.length === 0 && preview.bookings.length === 0) return 'flight'
  if (preview.hotels.length > 0 && preview.flights.length === 0 && preview.bookings.length === 0) return 'hotel'
  return 'other'
}

export function flightReady(flight: DraftFlight): boolean {
  return flight.flightIata.trim() !== '' && flight.date.trim() !== ''
}

export function hotelReady(hotel: DraftHotel): boolean {
  return hotel.name.trim() !== ''
}

export function bookingReady(booking: DraftBooking): boolean {
  return booking.label.trim() !== '' && booking.date.trim() !== ''
}
