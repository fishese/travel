import { describe, expect, it } from 'vitest'
import { hotelDateDefaults, trainDateDefaults } from './dateDefaults'

describe('editable date defaults', () => {
  it('defaults a train arrival to departure and preserves other booking fields', () => {
    expect(trainDateDefaults({ category: 'train', date: '2030-04-10', seat: '21A' })).toEqual({ category: 'train', date: '2030-04-10', arrivalDate: '2030-04-10', seat: '21A' })
    expect(trainDateDefaults({ category: 'train', date: '2030-04-10', arrivalDate: '' }).arrivalDate).toBe('2030-04-10')
  })

  it('does not overwrite overnight arrival or default non-train bookings', () => {
    expect(trainDateDefaults({ category: 'train', date: '2030-04-10', arrivalDate: '2030-04-11' }).arrivalDate).toBe('2030-04-11')
    expect(trainDateDefaults({ category: 'tour', date: '2030-04-10', arrivalDate: '' }).arrivalDate).toBe('')
  })

  it('defaults hotel check-out across month, year and leap-day boundaries', () => {
    for (const [checkIn, checkOut] of [['2030-04-10', '2030-04-11'], ['2030-04-30', '2030-05-01'], ['2030-12-31', '2031-01-01'], ['2032-02-28', '2032-02-29'], ['2030-02-28', '2030-03-01']]) {
      expect(hotelDateDefaults({ checkIn, checkOut: '' }).checkOut).toBe(checkOut)
    }
  })

  it('preserves an entered check-out even when start dates change', () => {
    expect(hotelDateDefaults({ checkIn: '2030-04-10', checkOut: '2030-04-15' }).checkOut).toBe('2030-04-15')
    expect(hotelDateDefaults({ checkIn: '2030-04-12', checkOut: '2030-04-11' }).checkOut).toBe('2030-04-11')
  })

  it('does not invent end dates from missing, ambiguous or invalid start dates', () => {
    for (const date of ['', '08/09', '2030-02-30']) {
      expect(hotelDateDefaults({ checkIn: date, checkOut: '' }).checkOut).toBe('')
      expect(trainDateDefaults({ category: 'train', date, arrivalDate: '' }).arrivalDate).toBe('')
    }
  })
})
