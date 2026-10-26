import { localDateStr } from '../dateUtils'
import { AIRLINES, AIRPORTS, CITY_NAMES, RISKY_AIRLINES, cityFromJapaneseAddress, findAirportCodes } from './codes'
import { addDays, findAmbiguousDates, findDates, findTimes, normalizeBookingText, timeAfter, type FoundDate } from './dates'
import { redactSensitive } from './sensitive'
import { RAW_TEXT_CAP, type DraftBooking, type DraftFlight, type DraftHotel, type ParsedImport } from './types'

const AIRLINE_ALT = [...AIRLINES].sort((a, b) => b.length - a.length || a.localeCompare(b)).join('|')
const FLIGHT_KEYWORD = /flight|便名|航班|搭乗便/i

function noteLines(...parts: Array<string | undefined | false>): string {
  return parts.filter((part): part is string => Boolean(part)).join('\n')
}

function hasFlightKeyword(text: string, index: number): boolean {
  return FLIGHT_KEYWORD.test(text.slice(Math.max(0, index - 24), index))
}

function isYearNumber(num: string): boolean {
  return /^(19|20)\d{2}$/.test(num)
}

interface FlightMention {
  iata: string
  index: number
  end: number
  loose: boolean
}

function findFlightMentions(text: string): FlightMention[] {
  const mentions: FlightMention[] = []
  const known = new RegExp(`(?<![A-Z0-9])(${AIRLINE_ALT})\\s{0,2}(\\d{2,4})(?![A-Z0-9])`, 'g')
  for (const match of text.matchAll(known)) {
    const airline = match[1].toUpperCase()
    const num = match[2]
    const spaced = /\s/.test(match[0].slice(airline.length, match[0].length - num.length))
    const keyword = hasFlightKeyword(text, match.index)
    if (RISKY_AIRLINES.has(airline) && spaced && !keyword) continue
    if (isYearNumber(num) && spaced && !keyword) continue
    mentions.push({ iata: airline + num, index: match.index, end: match.index + match[0].length, loose: false })
  }

  const loose = /(?<![A-Z0-9])([A-Z]{2}|[A-Z]\d|\d[A-Z])\s{0,2}(\d{2,4})(?![A-Z0-9])/g
  for (const match of text.matchAll(loose)) {
    const airline = match[1].toUpperCase()
    if (AIRLINES.has(airline)) continue
    if (mentions.some((item) => match.index < item.end && match.index + match[0].length > item.index)) continue
    if (!hasFlightKeyword(text, match.index)) continue
    if (isYearNumber(match[2])) continue
    mentions.push({ iata: airline + match[2], index: match.index, end: match.index + match[0].length, loose: true })
  }

  mentions.sort((a, b) => a.index - b.index)
  const kept: FlightMention[] = []
  let cursor = -1
  for (const mention of mentions) {
    if (mention.index < cursor) continue
    kept.push(mention)
    cursor = mention.end
  }
  return kept
}

function dateAfterKeyword(text: string, keyword: RegExp, today: string): FoundDate | undefined {
  const flags = keyword.flags.includes('g') ? keyword.flags : `${keyword.flags}g`
  const match = new RegExp(keyword.source, flags).exec(text)
  if (!match) return undefined
  const slice = text.slice(match.index, match.index + 80)
  const found = findDates(slice, today)[0]
  if (!found) return undefined
  return { ...found, index: match.index + found.index, end: match.index + found.end }
}

function precededBy(text: string, index: number, pattern: RegExp): boolean {
  return pattern.test(text.slice(Math.max(0, index - 16), index))
}

function flightWindowEnd(text: string, start: number, nextFlight: number): number {
  const slice = text.slice(start, nextFlight)
  let cut = -1
  const lineRe = /(?:^|\n)[ \t]*(?:hotel|accommodation|宿泊)[ \t]*(?:[:：][^\n]*)?(?:\n|$)/gi
  const lineHit = lineRe.exec(slice)
  if (lineHit && lineHit.index > 0) cut = lineHit.index
  const stayRe = /チェックイン|check[\s-]*in/gi
  for (const hit of slice.matchAll(stayRe)) {
    if (hit.index <= 0) continue
    if (precededBy(slice, hit.index, /online\s*$|web\s*$|mobile\s*$/i)) continue
    const before = slice.slice(0, hit.index)
    if (!isHotelish(before)) continue
    if (cut === -1 || hit.index < cut) cut = hit.index
  }
  return cut > 0 ? start + cut : nextFlight
}

function isHotelish(text: string): boolean {
  return /hotel|hyatt|hilton|ritz-carlton|ritz|marriott|sheraton|westin|granbell|hostel|resort|ホテル|旅館|宿名|宿泊/i.test(text)
}

function findConfirmation(text: string): string | undefined {
  const patterns = [
    /(?:booking\s*(?:reference|number|id)|booking\s*ref(?![a-z])|booking\s*no\.?(?![a-z])|confirmation\s*(?:number|code)|confirmation\s*no\.?(?![a-z])|itinerary\s*number|record\s*locator|予約番号|確認番号|\bpnr\b)\s*[:：#.]?\s*([A-Z0-9][A-Z0-9-]{3,19})/i,
    /(?:^|\n)\s*confirmation\s*[:：]\s*([A-Z0-9][A-Z0-9-]{3,19})/i,
  ]
  for (const pattern of patterns) {
    const match = text.match(pattern)
    if (match) return match[1]
  }
  return undefined
}

function findPassenger(text: string): string | undefined {
  const match = text.match(/(?:passengers?|搭乗者|旅客)\s*[:：]\s*([^\n]{2,60})/i)
  return match?.[1].trim()
}

function findSeat(text: string): string | undefined {
  const match = text.match(/(?:seat|座席)\s*[:：]\s*([^\n]{1,30})/i)
  return match?.[1].trim()
}

function findGuests(text: string): string | undefined {
  const match = text.match(/(?:number of guests|guests?|人数|reserved for)\s*[:：]\s*([^\n]{1,40})/i)
  return match?.[1].trim()
}

function findPhone(text: string): string {
  const match = text.match(/(?:phone|tel|電話)\s*[:：]\s*([+0-9][0-9+\-() ]{5,22})/i)
  return match?.[1].trim() ?? ''
}

function normalizePrice(raw: string): string | undefined {
  const trimmed = raw.trim()
  const yen = trimmed.match(/^[¥￥]\s*([\d,]+(?:\.\d+)?)/)
  if (yen) return `JPY ${yen[1]}`
  const en = trimmed.match(/^([\d,]+(?:\.\d+)?)\s*円/)
  if (en) return `JPY ${en[1]}`
  const coded = trimmed.match(/\b([A-Z]{3})\s*([\d,]+(?:\.\d+)?)/)
  if (coded) return `${coded[1]} ${coded[2]}`
  const amount = trimmed.match(/([\d,]+(?:\.\d+)?)/)
  return amount?.[1]
}

function findPrice(text: string): string | undefined {
  const match = text.match(/(?:total(?:\s*(?:price|amount))?|合計(?:金額)?|料金)\s*[:：]\s*([^\n]+)/i)
  if (!match) return undefined
  const price = normalizePrice(match[1])
  return price ? `Price: ${price}` : undefined
}

function routeFromCodes(text: string): { origin: string; destination: string; warnings: string[] } {
  const codes = findAirportCodes(text).filter((hit) => AIRPORTS.has(hit.code))
  const warnings: string[] = []
  if (codes.length === 1) {
    warnings.push('Only one airport was found, so the route was left blank.')
    return { origin: '', destination: '', warnings }
  }
  if (codes.length === 0) return { origin: '', destination: '', warnings }
  const [origin, destination] = codes
  if (origin.fromName || destination.fromName) {
    warnings.push('An airport was guessed from a place name. Check the codes.')
  }
  return { origin: origin.code, destination: destination.code, warnings }
}

function parseFlights(text: string, today: string): DraftFlight[] {
  const mentions = findFlightMentions(text)
  return mentions.map((mention, index) => {
    const next = mentions[index + 1]?.index ?? text.length
    const end = flightWindowEnd(text, mention.end, next)
    const body = text.slice(mention.index, end)
    const headStart = index === 0 ? 0 : mentions[index - 1].end
    const head = text.slice(Math.max(headStart, mention.index - 140), mention.index)
    const warnings: string[] = []
    if (mention.loose) warnings.push(`Airline code ${mention.iata.slice(0, 2)} is not in the built-in list. Check the flight number.`)

    const departure = dateAfterKeyword(body, /depart(?:s|ure)?|\bdep\b|出発/i, today) ?? findDates(body, today)[0]
    let date = departure?.date ?? ''
    let yearInferred = departure?.yearInferred ?? false
    if (!date) {
      const ambiguous = findAmbiguousDates(body)[0] ?? findAmbiguousDates(head)[0]
      if (ambiguous) warnings.push(`The date "${ambiguous}" is ambiguous, so it was left blank.`)
    } else if (yearInferred) {
      warnings.push(`No year was written, so ${date.slice(0, 4)} was assumed.`)
    }

    const depTime = timeAfter(body, /depart(?:s|ure)?|\bdep\b|出発/i) ?? findTimes(body)[0]?.time ?? ''
    const arrTime = timeAfter(body, /arriv(?:es|al)?|\barr\b|到着/i) ?? findTimes(body)[1]?.time ?? ''

    let arrivalDate = ''
    const arrivalExplicit = dateAfterKeyword(body, /arriv(?:es|al)?|\barr\b|到着/i, today)
    const overnight = /(?:\+1|翌\s*日|next\s+day)/i.test(body)
    if (arrivalExplicit) {
      arrivalDate = arrivalExplicit.date
    } else if (overnight && date) {
      arrivalDate = addDays(date, 1)
      warnings.push('The text marks arrival on the next day. Check the arrival date.')
    } else if (depTime && arrTime && arrTime < depTime && date) {
      arrivalDate = addDays(date, 1)
      warnings.push('Arrival time is earlier than departure, so the arrival date was set to the next day.')
    }

    let route = routeFromCodes(body)
    if (!route.origin) {
      const wider = routeFromCodes(`${head}\n${body}`)
      if (wider.origin) route = wider
    }
    warnings.push(...route.warnings)

    const header = text.slice(0, mentions[0]?.index ?? 0)
    const confirmation = findConfirmation(body) ?? findConfirmation(header) ?? findConfirmation(text)
    const passenger = findPassenger(body) ?? findPassenger(header)
    const seat = findSeat(body)
    return {
      flightIata: mention.iata,
      date,
      origin: route.origin,
      destination: route.destination,
      departureTime: depTime,
      arrivalTime: arrTime,
      arrivalDate,
      notes: noteLines(
        confirmation && `Confirmation: ${confirmation}`,
        passenger && `Passengers: ${passenger}`,
        seat && `Seat: ${seat}`,
      ),
      warnings,
      yearInferred,
    }
  })
}

interface StayHit {
  index: number
  date: FoundDate
}

function findStays(text: string, today: string): StayHit[] {
  const hits: StayHit[] = []
  for (const match of text.matchAll(/check[\s-]*in|チェックイン/gi)) {
    if (precededBy(text, match.index, /online\s*$|web\s*$|mobile\s*$/i)) continue
    const slice = text.slice(match.index, match.index + 90)
    const found = findDates(slice, today)[0]
    if (!found) continue
    hits.push({ index: match.index, date: { ...found, index: match.index + found.index, end: match.index + found.end } })
  }
  return hits
}

function hotelName(slice: string): string {
  const labeled = slice.match(/(?:hotel|宿名|施設名|宿泊施設)\s*[:：]\s*([^\n]+)/i)
  if (labeled) {
    const name = labeled[1].trim()
    if (name && !/^(hotel|ホテル)$/i.test(name)) return name.slice(0, 80)
  }
  const lines = slice.split('\n').map((line) => line.trim()).filter(Boolean)
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i]
    if (/^(hotel|ホテル|accommodation|宿泊)$/i.test(line)) continue
    if (/check-?in|check-?out|confirmation|booking|itinerary|address|住所|guest|total|phone|電話/i.test(line)) continue
    if (isHotelish(line)) return line.slice(0, 80)
  }
  return ''
}

function cityMentionedIn(text: string): string {
  const cities = [...CITY_NAMES].sort((a, b) => b.length - a.length)
  return cities.find((city) => text.toLowerCase().includes(city.toLowerCase())) ?? ''
}

function hotelAddress(slice: string, name: string): string {
  const labeled = slice.match(/(?:address|住所)\s*[:：]\s*([^\n]+)/i)
  if (labeled) return labeled[1].trim()
  const lines = slice.split('\n').map((line) => line.trim()).filter(Boolean)
  const nameIndex = lines.findIndex((line) => line === name || line.includes(name))
  const next = nameIndex >= 0 ? lines[nameIndex + 1] : undefined
  if (next && !/check|guest|total|phone|confirmation|予約|booking/i.test(next) && (/\d|,/.test(next) || cityMentionedIn(next))) return next
  return ''
}

function hotelCity(slice: string, address: string, name: string): string {
  const labeled = slice.match(/(?:^|\n)\s*city\s*[:：]\s*([^\n]+)/i)
  if (labeled) return labeled[1].trim()
  if (address) {
    const japanese = cityFromJapaneseAddress(address)
    if (japanese) return japanese
    const mentioned = cityMentionedIn(address)
    if (mentioned) return mentioned
  }
  return cityMentionedIn(name) || cityMentionedIn(slice)
}

function parseHotels(text: string, today: string): DraftHotel[] {
  const stays = findStays(text, today)
  const hotels: DraftHotel[] = []
  stays.forEach((stay, index) => {
    const prev = index === 0 ? 0 : stays[index - 1].index
    const next = stays[index + 1]?.index ?? text.length
    const between = text.slice(prev, stay.index)
    const marker = [...between.matchAll(/(?:^|\n)\s*(?:hotel|宿名|施設名)\s*[:：]/gi)].at(-1)
    const start = marker?.index !== undefined ? prev + marker.index : Math.max(prev, stay.index - 500)
    const slice = text.slice(start, next)
    const after = text.slice(stay.index, next)
    const checkOut = dateAfterKeyword(after, /check[\s-]*out|チェックアウト/i, today)
    if (!checkOut && !isHotelish(slice)) return
    const warnings: string[] = []
    if (stay.date.yearInferred) warnings.push(`No year was written, so ${stay.date.date.slice(0, 4)} was assumed.`)
    if (!checkOut && findAmbiguousDates(after).length > 0) {
      warnings.push('A check-out date looked ambiguous, so it was left blank.')
    }
    const name = hotelName(slice)
    const address = hotelAddress(slice, name)
    const checkInTime = timeAfter(after, /check[\s-]*in|チェックイン/i, 70)
    const checkOutTime = checkOut ? timeAfter(after, /check[\s-]*out|チェックアウト/i, 70) : undefined
    const region = text.slice(index === 0 ? 0 : stays[index - 1].index, next)
    const confirmation = findConfirmation(slice) ?? findConfirmation(region)
    hotels.push({
      name,
      city: hotelCity(slice, address, name),
      address,
      phone: findPhone(slice) || findPhone(region),
      checkIn: stay.date.date,
      checkOut: checkOut?.date ?? '',
      notes: noteLines(
        confirmation && `Confirmation: ${confirmation}`,
        findGuests(slice) && `Guests: ${findGuests(slice)}`,
        findPrice(slice),
        checkInTime && `Check-in time: ${checkInTime}`,
        checkOutTime && `Check-out time: ${checkOutTime}`,
      ),
      warnings,
    })
  })
  return hotels
}

function parseTrain(text: string, today: string): DraftBooking | null {
  if (!/新幹線|shinkansen|eurostar|\bTGV\b|\bICE\b|\bIntercity\b|\bRailjet\b|のぞみ|ひかり|こだま|はやぶさ|みずほ|さくら/i.test(text)) return null
  const found = findDates(text, today)[0]
  const service = text.match(/(のぞみ|ひかり|こだま|はやぶさ|みずほ|さくら|eurostar|shinkansen|TGV(?:\s+INOUI)?|ICE|Intercity|Railjet)\s*(\d{1,4})\s*(号)?/i)
  const route = text.match(/^([^\n]+?)\s+(\d{1,2}:\d{2})\s*発?\s*(?:→|->|⇒|—|–)\s*([^\n]+?)\s+(\d{1,2}:\d{2})/m)
  const label = service ? `${service[1]} ${service[2]}${service[3] ? '号' : ''}`.trim() : 'Train'
  const warnings: string[] = []
  if (!found) warnings.push('Add the departure date; no unambiguous date was found.')
  if (found?.yearInferred) warnings.push(`No year was written, so ${found.date.slice(0, 4)} was assumed.`)
  const seatText = findSeat(text)
  const coach = text.match(/(?:coach|car(?:riage)?|号車)\s*[:：]?\s*([\w-]+)/i)?.[1]
    ?? seatText?.match(/(\d+)号車/)?.[1]
  const seat = seatText?.replace(/(?:coach|car(?:riage)?)\s*\w+\s*/i, '').replace(/\d+号車\s*/, '').replace(/^seat\s*/i, '').trim()
  const origin = route?.[1].trim() ?? text.match(/(?:^|\n)\s*(?:from|origin)\s*[:：]\s*([^\n]+)/i)?.[1].trim()
  const destination = route?.[3].trim() ?? text.match(/(?:^|\n)\s*(?:to|destination)\s*[:：]\s*([^\n]+)/i)?.[1].trim()
  const departureTime = route?.[2] ?? timeAfter(text, /depart(?:ure|s)?/i) ?? findTimes(text)[0]?.time ?? ''
  const arrivalTime = route?.[4] ?? timeAfter(text, /arriv(?:al|es)?/i)
  const explicitArrival = dateAfterKeyword(text, /arriv(?:al|es)?/i, today)
  let arrivalDate = explicitArrival?.date
  if (!arrivalDate && found && /\+1|next day|翌日/i.test(text)) arrivalDate = addDays(found.date, 1)
  if (!arrivalDate && found && arrivalTime && departureTime && arrivalTime < departureTime) {
    warnings.push('Arrival is earlier than departure. Check the arrival date.')
  }
  return {
    category: 'train',
    label,
    date: found?.date ?? '',
    time: departureTime,
    operator: service?.[1],
    serviceNumber: service?.[2],
    origin,
    destination,
    arrivalTime,
    arrivalDate,
    coach,
    seat,
    notes: noteLines(
      findConfirmation(text) && `Confirmation: ${findConfirmation(text)}`,
      route ? `${route[1]} → ${route[3]}` : undefined,
      route ? `Arrival: ${route[4]}` : undefined,
      findSeat(text) && `Seat: ${findSeat(text)}`,
    ),
    warnings,
    yearInferred: found?.yearInferred ?? false,
  }
}

function parseTrains(text: string, today: string): DraftBooking[] {
  const serviceLine = /^(?:\s*(?:train|service)\s*[:：]?\s*)?(?:のぞみ|ひかり|こだま|はやぶさ|みずほ|さくら|eurostar|shinkansen|TGV(?:\s+INOUI)?|ICE|Intercity|Railjet)\s*\d{1,4}(?:号)?\s*$/gim
  const lines = [...text.matchAll(serviceLine)]
  if (lines.length < 2) {
    const train = parseTrain(text, today)
    return train ? [train] : []
  }
  const starts = lines.map((line, index) => {
    if (index === 0) return 0
    const before = text.slice(0, line.index).trimEnd()
    const previousLine = before.slice(before.lastIndexOf('\n') + 1)
    return findDates(previousLine, today).length || findAmbiguousDates(previousLine).length
      ? before.lastIndexOf('\n') + 1 : line.index
  })
  return starts.flatMap((start, index) => {
    const train = parseTrain(text.slice(start, starts[index + 1] ?? text.length), today)
    return train ? [train] : []
  })
}

function parseCar(text: string, today: string): DraftBooking | null {
  if (!/レンタカー|rent[-\s]?a[-\s]?car/i.test(text)) return null
  const dates = findDates(text, today)
  if (!dates[0]) return null
  const vehicle = text.match(/(?:車種|vehicle)\s*[:：]\s*([^\n]+)/i)?.[1].trim()
  const brand = text.match(/トヨタレンタカー|タイムズカー|オリックスレンタカー|rent-a-car|rent a car/i)?.[0]
  const pickup = text.match(/(?:出発店舗|貸出店舗|pickup location)\s*[:：]\s*([^\n]+)/i)?.[1].trim()
  const returnTime = timeAfter(text, /返却日時/i, 40)
  const warnings: string[] = []
  if (dates[0].yearInferred) warnings.push(`No year was written, so ${dates[0].date.slice(0, 4)} was assumed.`)
  return {
    category: 'car',
    label: [brand, vehicle].filter(Boolean).join(' ') || 'Car rental',
    date: dates[0].date,
    time: timeAfter(text, /貸出日時|貸出/i, 40) ?? findTimes(text)[0]?.time ?? '',
    notes: noteLines(
      findConfirmation(text) && `Confirmation: ${findConfirmation(text)}`,
      pickup && `Pickup: ${pickup}`,
      dates[1] && `Return: ${dates[1].date}${returnTime ? ` ${returnTime}` : ''}`,
      findPrice(text),
    ),
    warnings,
    yearInferred: dates[0].yearInferred,
  }
}

function parseTour(text: string, today: string): DraftBooking | null {
  if (!/teamlab|admission|museum|美術館|concert|exhibition|入場/i.test(text)) return null
  const found = findDates(text, today)[0]
  if (!found) return null
  const lines = text.split('\n').map((line) => line.trim()).filter(Boolean)
  const named = lines.find((line) => /teamlab|museum|美術館|concert|exhibition/i.test(line) && !/confirmation|e-?ticket/i.test(line))
  const warnings: string[] = []
  if (found.yearInferred) warnings.push(`No year was written, so ${found.date.slice(0, 4)} was assumed.`)
  const timed = text.match(/(?:^|\n)\s*time\s*[:：]\s*(\d{1,2}:\d{2})/i)
  return {
    category: 'tour',
    label: named ?? lines[0] ?? 'Ticket',
    date: found.date,
    time: timed?.[1] ?? findTimes(text)[0]?.time ?? '',
    notes: noteLines(
      findConfirmation(text) && `Confirmation: ${findConfirmation(text)}`,
      findGuests(text) && `Guests: ${findGuests(text)}`,
      findPrice(text),
    ),
    warnings,
    yearInferred: found.yearInferred,
  }
}

function firstUsefulLine(text: string): string {
  const lines = text.split('\n').map((line) => line.trim()).filter((line) => line.length >= 3)
  const skipped = /booking (confirmation|confirmed)|reservation confirmation|e-?ticket|itinerary/i
  return (lines.find((line) => !skipped.test(line)) ?? lines[0] ?? 'Booking').slice(0, 90)
}

/** Turns a confirmation email or PDF text layer into editable drafts.
 * Nothing here is saved. Callers show the drafts and let the person fix them. */
export function parseBookingDocument(input: string, today?: string): ParsedImport {
  const normalized = normalizeBookingText(input)
  const scanned = redactSensitive(normalized)
  const text = scanned.text
  const todayStr = today ?? localDateStr()
  const warnings: string[] = []
  if (scanned.findings.includes('passport')) warnings.push('A passport number was removed from the text that will be saved.')
  if (scanned.findings.includes('payment-card')) warnings.push('A card number was removed from the text that will be saved.')
  if (scanned.findings.includes('security-code')) warnings.push('A card security code was removed from the text that will be saved.')

  const flights = parseFlights(text, todayStr)
  const hotels = parseHotels(text, todayStr)
  const bookings: DraftBooking[] = []
  const trains = parseTrains(text, todayStr)
  const car = parseCar(text, todayStr)
  bookings.push(...trains)
  if (car) bookings.push(car)
  if (flights.length === 0 && hotels.length === 0 && bookings.length === 0) {
    const tour = parseTour(text, todayStr)
    if (tour) bookings.push(tour)
  }
  if (flights.length === 0 && hotels.length === 0 && bookings.length === 0) {
    const found = findDates(text, todayStr)[0]
    const confirmation = findConfirmation(text)
    if (found && confirmation) {
      bookings.push({
        category: 'other',
        label: firstUsefulLine(text),
        date: found.date,
        time: findTimes(text)[0]?.time ?? '',
        notes: noteLines(`Confirmation: ${confirmation}`, findPrice(text)),
        warnings: found.yearInferred ? [`No year was written, so ${found.date.slice(0, 4)} was assumed.`] : [],
        yearInferred: found.yearInferred,
      })
    }
  }
  if (flights.length === 0 && hotels.length === 0 && bookings.length === 0) {
    warnings.push('Nothing was recognized. You can still import a JSON file, or add the booking by hand.')
  }

  return {
    flights,
    hotels,
    bookings,
    warnings,
    sensitive: scanned.findings,
    rawText: text.slice(0, RAW_TEXT_CAP),
    suggestVault: scanned.findings.length > 0,
  }
}

