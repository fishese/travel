import { describe, expect, it } from 'vitest'
import { bookingIssues, bookingReady, flightIssues, flightReady, hotelIssues, hotelReady } from './storage'

describe('live import corrections', () => {
  it('identifies a reversed stay and clears the blocker after correction', () => {
    const row = { name: 'Fictional Inn', checkIn: '2031-02-18', checkOut: '2031-02-17' }
    expect(hotelIssues(row)).toEqual(['Check-out: must be on or after check-in.'])
    expect(hotelReady(row)).toBe(false)
    row.checkOut = '2031-02-19'
    expect(hotelIssues(row)).toEqual([])
    expect(hotelReady(row)).toBe(true)
  })
  it('reports only invalid fields and shares validation with save', () => {
    const row = { flightIata: 'BA321', date: '', origin: 'LONDON' }
    expect(flightIssues(row)).toHaveLength(2)
    expect(flightReady(row)).toBe(false)
    expect(flightIssues({ ...row, date: '2031-02-18', origin: 'LHR' })).toEqual([])
    expect(flightReady({ ...row, date: '2031-02-18', origin: 'LHR' })).toBe(true)
    const booking = { label: 'Fictional train', date: '2031-02-18', arrivalTime: '25:00' }
    expect(bookingIssues(booking)).toEqual(['Arrival time: use HH:mm or leave blank.'])
    expect(bookingReady(booking)).toBe(false)
  })
})
