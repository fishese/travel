import { afterEach, describe, expect, it, vi } from 'vitest'
import { newBooking } from '../bookings'
import { newFlight } from '../flights'
import { newHotel } from '../hotels'
import { readImportFiles } from './batch'
import { appendImportRecords } from './commit'
import { bookingIdentity, duplicateFlags, flightIdentity, hotelIdentity } from './duplicates'
import { parseImportJson } from './jsonFormat'
import { bookingReady, flightReady, hotelReady } from './storage'
import { parseBookingDocument } from './textParse'
import { validDate } from './validation'

afterEach(() => vi.unstubAllGlobals())

describe('journey imports', () => {
  it('preserves a printed flight arrival date across time zones', () => {
    const [flight] = parseBookingDocument('Flight BA321\nNRT -> LHR\nDeparture 2030-04-12 18:00\nArrival 2030-04-12 16:00').flights
    expect(flight).toMatchObject({ date: '2030-04-12', arrivalDate: '2030-04-12' })
  })
  it('keeps two services with separate dates, stations, confirmations and seats', () => {
    const result = parseBookingDocument('Eurostar 731\n2030-04-12\nParis Nord 10:00 -> Lyon Centre 12:00\nBooking reference: DEMOT1\nSeat: Coach 3 seat 21A\n\nTGV 842\n2030-04-15\nLyon Centre 09:00 -> Paris Nord 11:00\nBooking reference: DEMOT2\nSeat: Coach 5 seat 18C')
    expect(result.flights).toEqual([])
    expect(result.bookings).toHaveLength(2)
    expect(result.bookings[0]).toMatchObject({ category: 'train', date: '2030-04-12', operator: 'Eurostar', serviceNumber: '731', origin: 'Paris Nord', destination: 'Lyon Centre', time: '10:00', arrivalTime: '12:00', coach: '3', seat: '21A' })
    expect(result.bookings[1]).toMatchObject({ date: '2030-04-15', operator: 'TGV', serviceNumber: '842', coach: '5', seat: '18C' })
    expect(result.bookings[0].notes).not.toContain('DEMOT2')
  })

  it('keeps dates printed before service lines with their own journeys', () => {
    const result = parseBookingDocument('2030-04-12\nEurostar 731\nParis 10:00 -> Lyon 12:00\n\n2030-04-15\nTGV 842\nLyon 09:00 -> Paris 11:00')
    expect(result.bookings.map((row) => row.date)).toEqual(['2030-04-12', '2030-04-15'])
  })

  it('keeps an unresolved train date visible for correction', () => {
    const [train] = parseBookingDocument('TGV 842\n08/09/2030\nLyon 09:00 -> Paris 11:00').bookings
    expect(train.category).toBe('train')
    expect(train.date).toBe('')
    expect(bookingReady(train)).toBe(false)
  })

  it('keeps an explicit arrival date on overnight trains', () => {
    const [train] = parseBookingDocument('ICE 901\nDeparture 2030-04-12 23:00\nFrom: Example Central\nTo: Sample Central\nArrival 2030-04-13 06:00').bookings
    expect(train).toMatchObject({ date: '2030-04-12', time: '23:00', arrivalDate: '2030-04-13', arrivalTime: '06:00', origin: 'Example Central', destination: 'Sample Central' })
  })

  it('accepts and preserves structured train fields in version 1 JSON', () => {
    const result = parseImportJson(JSON.stringify({ format: 'travel-toolkit-import', version: 1, bookings: [{ category: 'train', label: 'Demo journey', date: '2030-04-12', operator: 'Demo Rail', serviceNumber: '42', origin: 'Example Central', destination: 'Sample Central', arrivalDate: '2030-04-13', arrivalTime: '06:00', coach: '3', seat: '21A' }] }))
    expect(result.ok).toBe(true)
    if (!result.ok) return
    const saved = newBooking(result.preview.bookings[0])
    expect(saved).toMatchObject({ operator: 'Demo Rail', origin: 'Example Central', arrivalDate: '2030-04-13', coach: '3', seat: '21A' })
  })
})

describe('review validation and duplicates', () => {
  it('rejects impossible dates and accepts a leap day', () => {
    expect(validDate('2030-02-29')).toBe(false)
    expect(validDate('2032-02-29')).toBe(true)
    expect(validDate('2030-04-31')).toBe(false)
    expect(validDate('')).toBe(false)
  })

  it('blocks missing flight dates and invalid optional times', () => {
    expect(flightReady({ flightIata: 'BA321', date: '' })).toBe(false)
    expect(flightReady({ flightIata: 'BA321', date: '2030-04-10', departureTime: '25:00' })).toBe(false)
    expect(flightReady({ flightIata: 'BA 321', date: '2030-04-10' })).toBe(true)
    expect(flightReady({ flightIata: 'BA1', date: '2030-04-10' })).toBe(true)
  })

  it('blocks reversed hotel stays and invalid train arrival times', () => {
    expect(hotelReady({ name: 'Demo Hotel', checkIn: '2030-04-12', checkOut: '2030-04-10' })).toBe(false)
    expect(bookingReady({ label: 'Demo train', date: '2030-04-10', arrivalTime: '99:00' })).toBe(false)
  })

  it('finds duplicates in storage and in a batch after normalizing fields', () => {
    expect(duplicateFlags([{ flightIata: 'ba 321', date: '2030-04-10' }, { flightIata: 'BA322', date: '2030-04-15' }, { flightIata: 'BA 322', date: '2030-04-15' }], [{ flightIata: 'BA321', date: '2030-04-10' }], flightIdentity)).toEqual([true, false, true])
    expect(hotelIdentity({ name: ' Demo  Hotel ', checkIn: '2030-04-10' })).toBe(hotelIdentity({ name: 'demo hotel', checkIn: '2030-04-10' }))
    expect(bookingIdentity({ category: 'train', label: ' DEMO  RAIL ', date: '2030-04-10' })).toBe(bookingIdentity({ category: 'train', label: 'demo rail', date: '2030-04-10' }))
  })
})

describe('multi-file queue', () => {
  it('keeps good previews when another PDF cannot be read and directs HTML to Itinerary', async () => {
    const files = [new File(['Flight BA321\nDeparture 2030-04-10 09:00'], 'flight.txt'), new File(['scan'], 'scan.pdf'), new File(['<html>Mock</html>'], 'plan.html')]
    const readPdf = vi.fn().mockRejectedValue(new Error('No selectable text in this PDF.'))
    const result = await readImportFiles(files, readPdf)
    expect(result.documents).toHaveLength(1)
    expect(result.documents[0].preview.flights).toHaveLength(1)
    expect(result.issues).toHaveLength(2)
    expect(result.issues[1].error).toMatch(/Itinerary/)
  })

  it('does not silently accept an empty or unrecognized file', async () => {
    const result = await readImportFiles([new File([''], 'empty.txt')], vi.fn())
    expect(result.documents).toEqual([])
    expect(result.issues).toHaveLength(1)
  })
})

describe('append-only commit', () => {
  function storage(failKey?: string) {
    const data = new Map<string, string>([['travel_flights', JSON.stringify([newFlight({ flightIata: 'BA100', date: '2030-04-01' })])], ['travel_active_trip', JSON.stringify('old-trip')]])
    let failed = false
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => data.get(key) ?? null,
      setItem: (key: string, value: string) => {
        if (key === failKey && !failed) { failed = true; throw new Error('Storage full') }
        data.set(key, value)
      },
      removeItem: (key: string) => data.delete(key),
    })
    return data
  }
  const records = () => ({ flights: [newFlight({ flightIata: 'BA321', date: '2030-04-10', tripId: 'new-trip' })], hotels: [newHotel({ name: 'Demo Hotel', city: 'Example', tripId: 'new-trip' })], bookings: [] })

  it('preserves existing records and sets the selected trip', () => {
    const data = storage()
    appendImportRecords(records(), 'new-trip')
    expect(JSON.parse(data.get('travel_flights')!)).toHaveLength(2)
    expect(JSON.parse(data.get('travel_hotels')!)[0].tripId).toBe('new-trip')
    expect(JSON.parse(data.get('travel_active_trip')!)).toBe('new-trip')
  })

  it('rolls back all changed keys if any list cannot be saved', () => {
    const data = storage('travel_hotels')
    const before = new Map(data)
    expect(() => appendImportRecords(records(), 'new-trip')).toThrow('Storage full')
    expect(data).toEqual(before)
  })

  it('rolls back lists if the active-trip write fails', () => {
    const data = storage('travel_active_trip')
    const before = new Map(data)
    expect(() => appendImportRecords(records(), 'new-trip')).toThrow('Storage full')
    expect(data).toEqual(before)
  })

  it('catches duplicates introduced since preview without mutating storage', () => {
    const data = storage()
    const next = records()
    data.set('travel_hotels', JSON.stringify(next.hotels))
    const before = new Map(data)
    expect(() => appendImportRecords(next)).toThrow(/duplicates/)
    expect(data).toEqual(before)
  })

  it('leaves malformed existing arrays untouched', () => {
    const data = storage()
    data.set('travel_hotels', '{}')
    const before = new Map(data)
    expect(() => appendImportRecords(records())).toThrow(/No records were replaced/)
    expect(data).toEqual(before)
  })
})
