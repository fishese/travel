import { describe, expect, it } from 'vitest'
import { hotelDraftFromBooking } from './hotelDraft'
import { hotelReady } from './storage'
import { newHotel } from '../hotels'
import type { DraftBooking } from './types'

const booking: DraftBooking = { category: 'other', label: 'Demo Lodge', date: '2030-04-10', time: '15:00', notes: 'Confirmation: DEMOH3', warnings: [], yearInferred: false }

describe('correct a booking to a hotel', () => {
  it('preserves its title, date and notes while leaving unknown stay details blank', () => {
    const hotel = hotelDraftFromBooking(booking)
    expect(hotel).toMatchObject({ name: 'Demo Lodge', checkIn: '2030-04-10', checkOut: '', city: '', address: '', phone: '' })
    expect(hotel.notes).toContain('Confirmation: DEMOH3')
    expect(hotel.notes).toContain('15:00')
    expect(hotelReady(hotel)).toBe(true)
    expect(newHotel({ ...hotel, tripId: 'demo-trip' })).toMatchObject({ name: 'Demo Lodge', tripId: 'demo-trip', checkIn: '2030-04-10' })
  })

  it('does not invent dates when a source date was unresolved', () => {
    expect(hotelDraftFromBooking({ ...booking, date: '', time: '' })).toMatchObject({ checkIn: '', checkOut: '' })
  })

  it('preserves structured journey details in notes if that category was wrong too', () => {
    const hotel = hotelDraftFromBooking({ ...booking, category: 'train', origin: 'Example Central', destination: 'Sample Central', arrivalTime: '18:00', coach: '3', seat: '21A' })
    expect(hotel.notes).toContain('Example Central → Sample Central')
    expect(hotel.notes).toContain('18:00')
    expect(hotel.notes).toContain('21A')
  })
})
