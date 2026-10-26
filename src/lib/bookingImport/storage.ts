import type { VaultCategory } from '../fileVault'
import type { DraftBooking, DraftFlight, DraftHotel, ParsedImport } from './types'
import { validDate, optionalDateValid, optionalTimeValid } from './validation'

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

export function flightReady(flight: Pick<DraftFlight, 'flightIata' | 'date'> & Partial<DraftFlight>): boolean {
  return /^(?:[A-Z]{2}|[A-Z]\d|\d[A-Z])\d{1,4}$/.test(flight.flightIata.toUpperCase().replace(/\s+/g, '')) && validDate(flight.date)
    && optionalDateValid(flight.arrivalDate) && optionalTimeValid(flight.departureTime) && optionalTimeValid(flight.arrivalTime)
    && (!flight.origin || /^[A-Z]{3}$/i.test(flight.origin.trim())) && (!flight.destination || /^[A-Z]{3}$/i.test(flight.destination.trim()))
}

export function hotelReady(hotel: Pick<DraftHotel, 'name'> & Partial<DraftHotel>): boolean {
  return hotel.name.trim() !== '' && optionalDateValid(hotel.checkIn) && optionalDateValid(hotel.checkOut)
    && !(hotel.checkIn && hotel.checkOut && hotel.checkOut < hotel.checkIn)
}

export function bookingReady(booking: Pick<DraftBooking, 'label' | 'date'> & Partial<DraftBooking>): boolean {
  return booking.label.trim() !== '' && validDate(booking.date) && optionalTimeValid(booking.time)
    && optionalDateValid(booking.arrivalDate) && optionalTimeValid(booking.arrivalTime)
}
