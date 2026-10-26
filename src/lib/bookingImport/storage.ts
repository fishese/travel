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

type FlightInput = Pick<DraftFlight, 'flightIata' | 'date'> & Partial<DraftFlight>
type HotelInput = Pick<DraftHotel, 'name'> & Partial<DraftHotel>
type BookingInput = Pick<DraftBooking, 'label' | 'date'> & Partial<DraftBooking>

export function flightIssues(flight: FlightInput): string[] {
  const issues: string[] = []
  if (!/^(?:[A-Z]{2}|[A-Z]\d|\d[A-Z])\d{1,4}$/.test(flight.flightIata.toUpperCase().replace(/\s+/g, ''))) issues.push('Flight number: enter an airline code and number.')
  if (!validDate(flight.date)) issues.push('Departure date: enter a valid date.')
  if (!optionalDateValid(flight.arrivalDate)) issues.push('Arrival date: enter a valid date or leave blank.')
  if (!optionalTimeValid(flight.departureTime)) issues.push('Departure time: use HH:mm or leave blank.')
  if (!optionalTimeValid(flight.arrivalTime)) issues.push('Arrival time: use HH:mm or leave blank.')
  if (flight.origin && !/^[A-Z]{3}$/i.test(flight.origin.trim())) issues.push('Origin: use a three-letter airport code or leave blank.')
  if (flight.destination && !/^[A-Z]{3}$/i.test(flight.destination.trim())) issues.push('Destination: use a three-letter airport code or leave blank.')
  return issues
}

export function hotelIssues(hotel: HotelInput): string[] {
  const issues: string[] = []
  if (!hotel.name.trim()) issues.push('Hotel name: enter a name.')
  if (!optionalDateValid(hotel.checkIn)) issues.push('Check-in: enter a valid date or leave blank.')
  if (!optionalDateValid(hotel.checkOut)) issues.push('Check-out: enter a valid date or leave blank.')
  if (hotel.checkIn && hotel.checkOut && validDate(hotel.checkIn) && validDate(hotel.checkOut) && hotel.checkOut < hotel.checkIn) issues.push('Check-out: must be on or after check-in.')
  return issues
}

export function bookingIssues(booking: BookingInput): string[] {
  const issues: string[] = []
  if (!booking.label.trim()) issues.push('Booking label: enter a title.')
  if (!validDate(booking.date)) issues.push('Booking date: enter a valid date.')
  if (!optionalTimeValid(booking.time)) issues.push('Booking time: use HH:mm or leave blank.')
  if (!optionalDateValid(booking.arrivalDate)) issues.push('Arrival date: enter a valid date or leave blank.')
  if (!optionalTimeValid(booking.arrivalTime)) issues.push('Arrival time: use HH:mm or leave blank.')
  return issues
}

export const flightReady = (flight: FlightInput): boolean => flightIssues(flight).length === 0
export const hotelReady = (hotel: HotelInput): boolean => hotelIssues(hotel).length === 0
export const bookingReady = (booking: BookingInput): boolean => bookingIssues(booking).length === 0
