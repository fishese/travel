import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { parseBookingDocument } from './textParse'
import { parseFlightText, parseBookingText } from '../pasteParse'

const TODAY = '2026-01-15'

function fixture(name: string): string {
  return readFileSync(new URL(`./fixtures/${name}`, import.meta.url), 'utf8')
}

function flight(name: string) {
  return parseBookingDocument(fixture(name), TODAY).flights
}

describe('confirmation fixtures', () => {
  it('reads a Singapore Airlines e-ticket', () => {
    const parsed = parseBookingDocument(fixture('singapore-airlines.txt'), TODAY)
    expect(parsed.flights).toHaveLength(1)
    expect(parsed.hotels).toHaveLength(0)
    const sq = parsed.flights[0]
    expect(sq.flightIata).toBe('SQ638')
    expect(sq.date).toBe('2026-08-25')
    expect(sq.origin).toBe('HKG')
    expect(sq.destination).toBe('NRT')
    expect(sq.departureTime).toBe('08:45')
    expect(sq.arrivalTime).toBe('14:10')
    expect(sq.arrivalDate).toBe('2026-08-25')
    expect(sq.notes).toContain('Confirmation: ABC123')
    expect(sq.notes).toContain('Passengers: Jane Doe')
    expect(sq.notes).toContain('Seat: 14A')
    expect(sq.yearInferred).toBe(false)
  })

  it('reads both legs of a Cathay return and ignores the booking reference', () => {
    const flights = flight('cathay-return.txt')
    expect(flights.map((item) => item.flightIata)).toEqual(['CX500', 'CX501'])
    expect(flights[0]).toMatchObject({ date: '2026-08-25', origin: 'HKG', destination: 'NRT', departureTime: '09:15', arrivalTime: '14:25' })
    expect(flights[1]).toMatchObject({ date: '2026-09-02', origin: 'NRT', destination: 'HKG', departureTime: '16:40', arrivalTime: '20:55' })
    expect(flights[0].notes).toContain('CX7K2P')
    expect(flights.every((item) => !/next day/i.test(item.warnings.join(' ')))).toBe(true)
  })

  it('converts United clock times without inventing an overnight arrival', () => {
    const [ua] = flight('united-sfo.txt')
    expect(ua).toMatchObject({ flightIata: 'UA869', date: '2026-08-25', origin: 'SFO', destination: 'SIN', departureTime: '11:20', arrivalTime: '19:45', arrivalDate: '' })
    expect(ua.warnings.join(' ')).not.toMatch(/next day/i)
    expect(ua.notes).toContain('HJK4L2')
    expect(ua.notes).toContain('Jane Doe')
  })

  it('reads an ANA Japanese itinerary', () => {
    const [nh] = flight('ana-japanese.txt')
    expect(nh).toMatchObject({ flightIata: 'NH860', date: '2026-08-25', origin: 'HND', destination: 'FUK', departureTime: '09:30', arrivalTime: '11:35' })
    expect(nh.notes).toContain('A1B2C3')
    expect(nh.notes).toContain('山田 太郎')
    expect(nh.warnings.join(' ')).toMatch(/place name/i)
  })

  it('reads a JAL connection without an overnight guess', () => {
    const flights = flight('jal-connection.txt')
    expect(flights).toHaveLength(2)
    expect(flights[0]).toMatchObject({ flightIata: 'JL006', origin: 'NRT', destination: 'JFK', date: '2026-09-01', departureTime: '18:30', arrivalTime: '18:45', arrivalDate: '' })
    expect(flights[1]).toMatchObject({ flightIata: 'JL007', origin: 'JFK', destination: 'HND', date: '2026-09-15', departureTime: '13:00', arrivalTime: '16:40' })
    expect(flights[0].warnings.join(' ')).not.toMatch(/next day/i)
    expect(flights[0].notes).toContain('JL9X8Y')
    expect(flights[0].notes).toContain('山田 花子')
  })

  it('reads Booking.com, Agoda, Expedia, and Jalan hotels', () => {
    const booking = parseBookingDocument(fixture('booking-com.txt'), TODAY)
    expect(booking.flights).toHaveLength(0)
    expect(booking.hotels[0]).toMatchObject({ name: 'Park Hyatt Tokyo', city: 'Tokyo', checkIn: '2026-08-25', checkOut: '2026-08-28', phone: '+81 3 5322 1234' })
    expect(booking.hotels[0].address).toContain('Nishi Shinjuku')
    expect(booking.hotels[0].notes).toContain('Confirmation: 1234567890')
    expect(booking.hotels[0].notes).toContain('Guests: 2 adults')
    expect(booking.hotels[0].notes).toContain('Price: JPY 186,000')
    expect(booking.hotels[0].notes).toContain('Check-in time: 15:00')

    const agoda = parseBookingDocument(fixture('agoda.txt'), TODAY).hotels[0]
    expect(agoda).toMatchObject({ name: 'Hilton Osaka', city: 'Osaka', checkIn: '2026-08-25', checkOut: '2026-08-27', phone: '+81 6 6347 7111' })
    expect(agoda.notes).toContain('Confirmation: 88990011')
    expect(agoda.notes).toContain('Guests: 1')
    expect(agoda.notes).toContain('Price: USD 420.00')

    const expedia = parseBookingDocument(fixture('expedia.txt'), TODAY).hotels[0]
    expect(expedia.name).toBe('The Ritz-Carlton Kyoto')
    expect(expedia.city).toBe('Kyoto')
    expect(expedia.checkIn).toBe('2026-09-02')
    expect(expedia.checkOut).toBe('2026-09-05')
    expect(expedia.notes).toContain('Confirmation: 720123456789')
    expect(expedia.notes).toContain('Guests: 2 adults')
    expect(expedia.notes).toContain('Price: JPY 248,000')

    const jalan = parseBookingDocument(fixture('jalan.txt'), TODAY).hotels[0]
    expect(jalan.name).toBe('箱根 花紋')
    expect(jalan.city).toBe('箱根町')
    expect(jalan.address).toContain('箱根町')
    expect(jalan.phone).toBe('0460-85-1234')
    expect(jalan).toMatchObject({ checkIn: '2026-08-25', checkOut: '2026-08-26' })
    expect(jalan.notes).toContain('Confirmation: R1234567')
    expect(jalan.notes).toContain('Guests: 2名')
    expect(jalan.notes).toContain('Price: JPY 28,600')
  })

  it('splits a Trip.com email into a flight and a hotel', () => {
    const parsed = parseBookingDocument(fixture('trip-com.txt'), TODAY)
    expect(parsed.flights).toHaveLength(1)
    expect(parsed.flights[0]).toMatchObject({ flightIata: 'SQ638', date: '2026-08-25', origin: 'HKG', destination: 'NRT', departureTime: '08:45', arrivalTime: '14:10' })
    expect(parsed.hotels).toHaveLength(1)
    expect(parsed.hotels[0]).toMatchObject({ name: 'Shinjuku Granbell Hotel', city: 'Tokyo', checkIn: '2026-08-25', checkOut: '2026-08-28' })
    expect(parsed.hotels[0].notes).toContain('Price: JPY 54000')
    expect(parsed.hotels[0].notes).toContain('Guests: 2 adults')
  })

  it('keeps a shinkansen ticket as a train and not a flight', () => {
    const parsed = parseBookingDocument(fixture('jr-shinkansen.txt'), TODAY)
    expect(parsed.flights).toHaveLength(0)
    expect(parsed.bookings).toHaveLength(1)
    const train = parsed.bookings[0]
    expect(train.category).toBe('train')
    expect(train.label).toContain('のぞみ 123')
    expect(train.date).toBe('2026-08-25')
    expect(train.time).toBe('10:00')
    expect(train.notes).toContain('E12345')
    expect(train.notes).toContain('東京 → 新大阪')
    expect(train.notes).toContain('12:30')
    expect(train.notes).toMatch(/seat/i)
  })

  it('reads a car rental without turning the airport shop into a flight', () => {
    const parsed = parseBookingDocument(fixture('toyota-rentacar.txt'), TODAY)
    expect(parsed.flights).toHaveLength(0)
    expect(parsed.bookings).toHaveLength(1)
    const car = parsed.bookings[0]
    expect(car.category).toBe('car')
    expect(car.label).toContain('ヤリス')
    expect(car.label).toContain('トヨタレンタカー')
    expect(car.date).toBe('2026-08-25')
    expect(car.time).toBe('16:00')
    expect(car.notes).toContain('2026-08-28')
    expect(car.notes).toContain('18:00')
    expect(car.notes).toContain('Price: JPY 24,200')
    expect(car.notes).toContain('T987654')
  })

  it('reads an admission ticket as a tour', () => {
    const parsed = parseBookingDocument(fixture('teamlab-ticket.txt'), TODAY)
    expect(parsed.bookings).toHaveLength(1)
    const tour = parsed.bookings[0]
    expect(tour.category).toBe('tour')
    expect(tour.label).toBe('TeamLab Planets Tokyo')
    expect(tour.date).toBe('2026-08-26')
    expect(tour.time).toBe('10:30')
    expect(tour.notes).toContain('TL-44521')
    expect(tour.notes).toContain('Price: JPY 7,600')
  })

  it('strips passport and card details before they can land in a public record', () => {
    const parsed = parseBookingDocument(fixture('sensitive-passport.txt'), TODAY)
    expect(parsed.suggestVault).toBe(true)
    expect(parsed.sensitive).toEqual(expect.arrayContaining(['passport', 'payment-card', 'security-code']))
    expect(parsed.flights[0]).toMatchObject({ flightIata: 'SQ638', origin: 'HKG', destination: 'NRT', date: '2026-08-25', departureTime: '08:45', arrivalTime: '14:10' })
    const saved = `${parsed.rawText}\n${parsed.flights[0].notes}`
    expect(saved).not.toContain('AB1234567')
    expect(saved).not.toContain('4111 1111 1111 1111')
    expect(saved).not.toContain('4111111111111111')
    expect(saved).not.toMatch(/CVV:\s*123/)
    expect(saved).toContain('XYZ789')
    expect(saved).toContain('Jane Doe')
  })

  it('leaves an ambiguous numeric date blank', () => {
    const parsed = parseBookingDocument('Flight SQ 638 on 08/09/2026 from HKG to NRT. Departs 08:45. Arrives 14:10.', TODAY)
    expect(parsed.flights[0].flightIata).toBe('SQ638')
    expect(parsed.flights[0].origin).toBe('HKG')
    expect(parsed.flights[0].destination).toBe('NRT')
    expect(parsed.flights[0].date).toBe('')
    expect(parsed.flights[0].warnings.join(' ')).toMatch(/ambiguous/i)
  })

  it('does not treat a hotel clock time as a flight', () => {
    const text = 'Thanks for staying with us. Please arrive at 15:00.\nHotel: Hyatt Place\nCheck-in: 25 Aug 2026\nCheck-out: 27 Aug 2026\n'
    const parsed = parseBookingDocument(text, TODAY)
    expect(parsed.flights).toHaveLength(0)
    expect(parsed.hotels).toHaveLength(1)
    expect(parsed.hotels[0].name).toBe('Hyatt Place')
  })

  it('does not turn online check-in into a hotel', () => {
    const text = 'Flight SQ 638\nHong Kong (HKG) to Narita (NRT)\nDeparture: 25 Aug 2026 08:45\nArrival: 25 Aug 2026 14:10\nOnline check-in opens 24 Aug 2026.\n'
    const parsed = parseBookingDocument(text, TODAY)
    expect(parsed.flights).toHaveLength(1)
    expect(parsed.hotels).toHaveLength(0)
    expect(parsed.flights[0].date).toBe('2026-08-25')
    expect(parsed.flights[0].arrivalDate).toBe('2026-08-25')
  })

  it('reads two hotels in one paste', () => {
    const text = 'Hotel: First Inn\nCheck-in: 25 Aug 2026\nCheck-out: 26 Aug 2026\n\nHotel: Second Inn\nCheck-in: 26 Aug 2026\nCheck-out: 28 Aug 2026\n'
    const hotels = parseBookingDocument(text, TODAY).hotels
    expect(hotels.map((hotel) => hotel.name)).toEqual(['First Inn', 'Second Inn'])
    expect(hotels[0].checkOut).toBe('2026-08-26')
    expect(hotels[1].checkIn).toBe('2026-08-26')
  })

  it('still fills the single-record forms', () => {
    expect(parseFlightText(fixture('singapore-airlines.txt')).flightIata).toBe('SQ638')
    expect(parseBookingText(fixture('jr-shinkansen.txt')).category).toBe('train')
  })
})
