import { redactSensitive } from './sensitive'
import { RAW_TEXT_CAP, type DraftBooking, type DraftFlight, type DraftHotel, type ImportBookingCategory, type ImportParseResult, type ParsedImport } from './types'
import { parseBookingDocument } from './textParse'

const CATEGORIES: ImportBookingCategory[] = ['flight', 'train', 'tour', 'restaurant', 'show', 'car', 'other']

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function optionalString(value: unknown, label: string): string | { error: string } {
  if (value === undefined || value === null || value === '') return ''
  if (typeof value !== 'string') return { error: `${label} must be a string.` }
  return redactSensitive(value).text.trim()
}

function optionalDate(value: unknown, label: string): string | { error: string } {
  const text = optionalString(value, label)
  if (typeof text !== 'string') return text
  if (!text) return ''
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return { error: `${label} must be YYYY-MM-DD.` }
  const [year, month, day] = text.split('-').map(Number)
  const date = new Date(year, month - 1, day)
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return { error: `${label} is not a real calendar date.` }
  }
  return text
}

function optionalTime(value: unknown, label: string): string | { error: string } {
  const text = optionalString(value, label)
  if (typeof text !== 'string') return text
  if (!text) return ''
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(text)) return { error: `${label} must be HH:mm in 24-hour time.` }
  return text
}

function stringList(value: unknown, label: string): string[] | { error: string } {
  if (value === undefined || value === null) return []
  if (!Array.isArray(value) || value.some((item) => typeof item !== 'string')) return { error: `${label} must be a list of strings.` }
  return value.map((item) => redactSensitive(item).text.trim()).filter(Boolean)
}

function fail(error: string): { error: string } {
  return { error }
}

function isError(value: unknown): value is { error: string } {
  return typeof value === 'object' && value !== null && 'error' in value
}

function notesFrom(...parts: Array<string | undefined | false>): string {
  return parts.filter((part): part is string => Boolean(part)).join('\n')
}

function readFlight(value: unknown, index: number): DraftFlight | { error: string } {
  if (!isRecord(value)) return fail(`Flight ${index + 1} must be an object.`)
  const flightNumber = optionalString(value.flightNumber, `Flight ${index + 1} flightNumber`)
  if (typeof flightNumber !== 'string') return flightNumber
  if (!flightNumber) return fail(`Flight ${index + 1} needs a flightNumber.`)
  const date = optionalDate(value.date, `Flight ${index + 1} date`)
  if (typeof date !== 'string') return date
  if (!date) return fail(`Flight ${index + 1} needs a date.`)
  const origin = optionalString(value.origin, `Flight ${index + 1} origin`)
  const destination = optionalString(value.destination, `Flight ${index + 1} destination`)
  const departureTime = optionalTime(value.departureTime, `Flight ${index + 1} departureTime`)
  const arrivalTime = optionalTime(value.arrivalTime, `Flight ${index + 1} arrivalTime`)
  const arrivalDate = optionalDate(value.arrivalDate, `Flight ${index + 1} arrivalDate`)
  const confirmation = optionalString(value.confirmation, `Flight ${index + 1} confirmation`)
  const notes = optionalString(value.notes, `Flight ${index + 1} notes`)
  const passengers = stringList(value.passengers, `Flight ${index + 1} passengers`)
  const fields = [origin, destination, departureTime, arrivalTime, arrivalDate, confirmation, notes, passengers]
  const problem = fields.find(isError)
  if (problem) return problem
  const warnings: string[] = []
  const originCode = typeof origin === 'string' ? origin.toUpperCase() : ''
  const destinationCode = typeof destination === 'string' ? destination.toUpperCase() : ''
  if (originCode && !/^[A-Z]{3}$/.test(originCode)) warnings.push('Origin should be a 3-letter airport code.')
  if (destinationCode && !/^[A-Z]{3}$/.test(destinationCode)) warnings.push('Destination should be a 3-letter airport code.')
  return {
    flightIata: flightNumber.toUpperCase().replace(/\s+/g, ''),
    date,
    origin: /^[A-Z]{3}$/.test(originCode) ? originCode : '',
    destination: /^[A-Z]{3}$/.test(destinationCode) ? destinationCode : '',
    departureTime: departureTime as string,
    arrivalTime: arrivalTime as string,
    arrivalDate: arrivalDate as string,
    notes: notesFrom(
      typeof confirmation === 'string' && confirmation && `Confirmation: ${confirmation}`,
      Array.isArray(passengers) && passengers.length > 0 && `Passengers: ${passengers.join(', ')}`,
      typeof notes === 'string' && notes,
    ),
    warnings,
    yearInferred: false,
  }
}

function readHotel(value: unknown, index: number): DraftHotel | { error: string } {
  if (!isRecord(value)) return fail(`Hotel ${index + 1} must be an object.`)
  const name = optionalString(value.name, `Hotel ${index + 1} name`)
  if (typeof name !== 'string') return name
  if (!name) return fail(`Hotel ${index + 1} needs a name.`)
  const city = optionalString(value.city, `Hotel ${index + 1} city`)
  const address = optionalString(value.address, `Hotel ${index + 1} address`)
  const phone = optionalString(value.phone, `Hotel ${index + 1} phone`)
  const checkIn = optionalDate(value.checkIn, `Hotel ${index + 1} checkIn`)
  const checkOut = optionalDate(value.checkOut, `Hotel ${index + 1} checkOut`)
  const confirmation = optionalString(value.confirmation, `Hotel ${index + 1} confirmation`)
  const guests = optionalString(value.guests, `Hotel ${index + 1} guests`)
  const price = optionalString(value.price, `Hotel ${index + 1} price`)
  const notes = optionalString(value.notes, `Hotel ${index + 1} notes`)
  const fields = [city, address, phone, checkIn, checkOut, confirmation, guests, price, notes]
  const problem = fields.find(isError)
  if (problem) return problem
  return {
    name,
    city: city as string,
    address: address as string,
    phone: phone as string,
    checkIn: checkIn as string,
    checkOut: checkOut as string,
    notes: notesFrom(
      typeof confirmation === 'string' && confirmation && `Confirmation: ${confirmation}`,
      typeof guests === 'string' && guests && `Guests: ${guests}`,
      typeof price === 'string' && price && `Price: ${price}`,
      typeof notes === 'string' && notes,
    ),
    warnings: [],
  }
}

function readBooking(value: unknown, index: number): DraftBooking | { error: string } {
  if (!isRecord(value)) return fail(`Booking ${index + 1} must be an object.`)
  const label = optionalString(value.label, `Booking ${index + 1} label`)
  if (typeof label !== 'string') return label
  if (!label) return fail(`Booking ${index + 1} needs a label.`)
  const date = optionalDate(value.date, `Booking ${index + 1} date`)
  if (typeof date !== 'string') return date
  if (!date) return fail(`Booking ${index + 1} needs a date.`)
  const category = optionalString(value.category, `Booking ${index + 1} category`)
  if (typeof category !== 'string') return category
  if (!CATEGORIES.includes(category as ImportBookingCategory)) {
    return fail(`Booking ${index + 1} category "${category}" is not supported.`)
  }
  const time = optionalTime(value.time, `Booking ${index + 1} time`)
  const journey = {
    operator: optionalString(value.operator, 'Train operator'),
    serviceNumber: optionalString(value.serviceNumber, 'Train service number'),
    origin: optionalString(value.origin, 'From station'),
    destination: optionalString(value.destination, 'To station'),
    arrivalDate: optionalDate(value.arrivalDate, 'Train arrival date'),
    arrivalTime: optionalTime(value.arrivalTime, 'Train arrival time'),
    coach: optionalString(value.coach, 'Coach'),
    seat: optionalString(value.seat, 'Seat'),
  }
  const confirmation = optionalString(value.confirmation, `Booking ${index + 1} confirmation`)
  const notes = optionalString(value.notes, `Booking ${index + 1} notes`)
  const fields = [time, confirmation, notes, ...Object.values(journey)]
  const problem = fields.find(isError)
  if (problem) return problem
  return {
    category: category as ImportBookingCategory,
    label,
    date,
    time: time as string,
    ...journey as Record<keyof typeof journey, string>,
    notes: notesFrom(
      typeof confirmation === 'string' && confirmation && `Confirmation: ${confirmation}`,
      typeof notes === 'string' && notes,
    ),
    warnings: [],
    yearInferred: false,
  }
}

function readList<T>(value: unknown, label: string, read: (item: unknown, index: number) => T | { error: string }): T[] | { error: string } {
  if (value === undefined) return []
  if (!Array.isArray(value)) return fail(`${label} must be a list.`)
  const items: T[] = []
  for (let index = 0; index < value.length; index++) {
    const item = read(value[index], index)
    if (isError(item)) return item
    items.push(item)
  }
  return items
}

export function parseImportJson(input: string): ImportParseResult {
  let data: unknown
  try {
    data = JSON.parse(input)
  } catch {
    return { ok: false, error: 'That is not valid JSON.' }
  }
  if (!isRecord(data) || data.format !== 'travel-toolkit-import') {
    return { ok: false, error: 'That is not a travel-toolkit-import file.' }
  }
  if (data.version !== 1) {
    return { ok: false, error: 'Unsupported import version. This app reads version 1.' }
  }
  const flights = readList(data.flights, 'flights', readFlight)
  if ('error' in flights) return { ok: false, error: flights.error }
  const hotels = readList(data.hotels, 'hotels', readHotel)
  if ('error' in hotels) return { ok: false, error: hotels.error }
  const bookings = readList(data.bookings, 'bookings', readBooking)
  if ('error' in bookings) return { ok: false, error: bookings.error }
  if (flights.length + hotels.length + bookings.length === 0) {
    return { ok: false, error: 'Nothing to import. Add a flight, hotel, or booking.' }
  }
  const scanned = redactSensitive(input)
  const warnings: string[] = []
  if (scanned.findings.includes('passport')) warnings.push('A passport number was removed from the text that will be saved.')
  if (scanned.findings.includes('payment-card')) warnings.push('A card number was removed from the text that will be saved.')
  if (scanned.findings.includes('security-code')) warnings.push('A card security code was removed from the text that will be saved.')
  const preview: ParsedImport = {
    flights,
    hotels,
    bookings,
    warnings,
    sensitive: scanned.findings,
    rawText: scanned.text.slice(0, RAW_TEXT_CAP),
    suggestVault: scanned.findings.length > 0,
  }
  return { ok: true, preview }
}

export function parseImportInput(input: string, today?: string): ImportParseResult {
  if (input.trim().startsWith('{')) return parseImportJson(input)
  return { ok: true, preview: parseBookingDocument(input, today) }
}

