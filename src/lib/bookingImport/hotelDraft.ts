import type { DraftBooking, DraftHotel } from './types'
import { hotelDateDefaults } from './dateDefaults'

/** Correct a misclassified stay without losing its confirmation or source details. */
export function hotelDraftFromBooking(booking: DraftBooking): DraftHotel {
  return hotelDateDefaults({
    name: booking.label,
    city: '',
    address: '',
    phone: '',
    checkIn: booking.date,
    checkOut: '',
    notes: [
      booking.notes,
      booking.time && `Booking time: ${booking.time}`,
      (booking.operator || booking.serviceNumber) && `Service: ${[booking.operator, booking.serviceNumber].filter(Boolean).join(' ')}`,
      (booking.origin || booking.destination) && `Route: ${booking.origin ?? '?'} → ${booking.destination ?? '?'}`,
      (booking.arrivalDate || booking.arrivalTime) && `Arrival: ${[booking.arrivalDate, booking.arrivalTime].filter(Boolean).join(' ')}`,
      booking.coach && `Coach: ${booking.coach}`,
      booking.seat && `Seat: ${booking.seat}`,
    ].filter(Boolean).join('\n'),
    warnings: ['Changed to a hotel stay. Check the hotel name and check-in date, then add check-out and contact details.'],
  })
}
