import { localDateStr } from './dateUtils'
import type { BookingCategory } from './bookings'

// ---------------------------------------------------------------------
// Shared: date extraction
// ---------------------------------------------------------------------

const MONTHS: Record<string, number> = {
  jan: 1,
  january: 1,
  feb: 2,
  february: 2,
  mar: 3,
  march: 3,
  apr: 4,
  april: 4,
  may: 5,
  jun: 6,
  june: 6,
  jul: 7,
  july: 7,
  aug: 8,
  august: 8,
  sep: 9,
  sept: 9,
  september: 9,
  oct: 10,
  october: 10,
  nov: 11,
  november: 11,
  dec: 12,
  december: 12,
}
const MONTH_NAMES_PATTERN = Object.keys(MONTHS)
  .sort((a, b) => b.length - a.length) // longest-first so "september" wins over "sep"
  .join('|')

function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

export interface ParsedDate {
  date: string // YYYY-MM-DD
  /** True when the source text had no year and one was inferred (nearest
   * upcoming occurrence of that month/day) — worth a visible "assumed
   * 2027" style flag in the UI rather than silently trusting it. */
  yearInferred: boolean
}

/**
 * Finds the first unambiguous date in free text. Deliberately does NOT
 * attempt slash/dot numeric dates like 25/08/2026 — that's DD/MM in Hong
 * Kong and MM/DD in a US airline's email, and guessing wrong would silently
 * pick the wrong month. Same "don't guess, leave it out" call napkinMath.ts
 * already makes for arithmetic. Month-name dates and ISO dates are the only
 * formats trusted enough to auto-fill.
 */
export function findDate(text: string, today: string = localDateStr()): ParsedDate | null {
  const iso = text.match(/\b(\d{4})-(\d{2})-(\d{2})\b/)
  if (iso) {
    const [, y, m, d] = iso
    if (+m >= 1 && +m <= 12 && +d >= 1 && +d <= 31) {
      return { date: `${y}-${m}-${d}`, yearInferred: false }
    }
  }

  // "25 Aug 2026" / "25th August 2026"
  const dmy = text.match(
    new RegExp(`\\b(\\d{1,2})(?:st|nd|rd|th)?\\s+(${MONTH_NAMES_PATTERN})\\.?,?\\s*(\\d{4})?\\b`, 'i'),
  )
  // "Aug 25, 2026" / "August 25 2026"
  const mdy = text.match(
    new RegExp(`\\b(${MONTH_NAMES_PATTERN})\\.?\\s+(\\d{1,2})(?:st|nd|rd|th)?,?\\s*(\\d{4})?\\b`, 'i'),
  )

  let day: number | undefined
  let month: number | undefined
  let year: number | undefined

  if (dmy) {
    day = +dmy[1]
    month = MONTHS[dmy[2].toLowerCase()]
    year = dmy[3] ? +dmy[3] : undefined
  } else if (mdy) {
    month = MONTHS[mdy[1].toLowerCase()]
    day = +mdy[2]
    year = mdy[3] ? +mdy[3] : undefined
  } else {
    return null
  }

  if (!month || !day || day < 1 || day > 31) return null

  let yearInferred = false
  if (!year) {
    yearInferred = true
    const thisYear = +today.slice(0, 4)
    const candidate = `${thisYear}-${pad2(month)}-${pad2(day)}`
    year = candidate < today ? thisYear + 1 : thisYear
  }

  return { date: `${year}-${pad2(month)}-${pad2(day)}`, yearInferred }
}

// ---------------------------------------------------------------------
// Shared: time extraction
// ---------------------------------------------------------------------

interface TimeMatch {
  time: string // HH:mm, 24h
  index: number
}

function findAllTimes(text: string): TimeMatch[] {
  const re = /\b([01]?\d|2[0-3]):([0-5]\d)\s*([AaPp]\.?[Mm]\.?)?/g
  const out: TimeMatch[] = []
  let m: RegExpExecArray | null
  while ((m = re.exec(text))) {
    let h = +m[1]
    const ampm = m[3]?.toLowerCase().replace(/\./g, '')
    if (ampm === 'pm' && h < 12) h += 12
    if (ampm === 'am' && h === 12) h = 0
    if (h > 23) continue // e.g. a stray "24:xx" some systems use for midnight-next-day
    out.push({ time: `${pad2(h)}:${m[2]}`, index: m.index })
  }
  return out
}

function nearestTimeTo(
  times: TimeMatch[],
  text: string,
  keywordRe: RegExp,
  opposingKeywordRe?: RegExp,
): string | undefined {
  const kw = keywordRe.exec(text)
  if (!kw) return undefined
  const kwEnd = kw.index + kw[0].length

  // Prefer a time that comes AFTER the keyword — "Departs 10:30",
  // "Departure: 10:30", "Dep 07:15" are all far and away the most common
  // phrasings in real airline confirmations and boarding passes.
  let best: TimeMatch | undefined
  let bestDist = Infinity
  for (const t of times) {
    if (t.index < kwEnd) continue
    const dist = t.index - kwEnd
    if (dist < bestDist && dist < 60) {
      bestDist = dist
      best = t
    }
  }
  if (best) return best.time

  // Fall back to the nearest time in either direction, for less common
  // reversed phrasing like "10:15 departure" — but only if it isn't
  // actually closer to the OTHER keyword, so "Arrives" can't steal a time
  // that's really describing "Departs" a few words earlier. (A text that
  // mixes both a reversed departure AND a forward arrival close together
  // can still occasionally cross wires — an edge case rare enough in real
  // confirmations that it's not worth chasing further given this is
  // always a prefill the person reviews before saving, never silently
  // trusted.)
  for (const t of times) {
    const dist = Math.abs(t.index - kw.index)
    if (opposingKeywordRe) {
      const opposing = opposingKeywordRe.exec(text)
      if (opposing && Math.abs(t.index - opposing.index) < dist) continue
    }
    if (dist < bestDist && dist < 60) {
      bestDist = dist
      best = t
    }
  }
  return best?.time
}

// ---------------------------------------------------------------------
// Flight-specific extraction
// ---------------------------------------------------------------------

const FLIGHT_NUM_BODY = '\\b([A-Z]{2}|[A-Z]\\d|\\d[A-Z])\\s?(\\d{2,4})'

/**
 * Airline code (2 letters, or letter+digit either order — real IATA
 * designators like "B6", "5J" mix both) followed by a 2-4 digit flight
 * number. Biased toward a match near the word "flight" first, since a bare
 * pattern like this can accidentally match things like "Gate 32" — the
 * proximity check is what keeps false positives rare in practice; any
 * miss is just a quick edit before saving, not a silent bad save.
 */
export function findFlightNumber(text: string): string | undefined {
  const flightIdx = text.search(/flight/i)
  if (flightIdx >= 0) {
    const window = text.slice(flightIdx, flightIdx + 40)
    const m = window.match(new RegExp(FLIGHT_NUM_BODY, 'i'))
    if (m) return (m[1] + m[2]).toUpperCase()
  }
  const lineMatch = text.match(new RegExp(`^\\s*${FLIGHT_NUM_BODY}`, 'im'))
  if (lineMatch) return (lineMatch[1] + lineMatch[2]).toUpperCase()
  const anyMatch = text.match(new RegExp(FLIGHT_NUM_BODY, 'i'))
  return anyMatch ? (anyMatch[1] + anyMatch[2]).toUpperCase() : undefined
}

/**
 * Origin/destination IATA codes, tried in descending order of confidence:
 * an arrow between two codes, two parenthesised codes ("Hong Kong (HKG) to
 * Tokyo (NRT)"), then a bare dash between two codes as a last resort.
 */
export function findAirportPair(text: string): { origin?: string; destination?: string } {
  const arrow = text.match(/\b([A-Z]{3})\s*(?:→|⇒|->|–|—)\s*([A-Z]{3})\b/)
  if (arrow) return { origin: arrow[1], destination: arrow[2] }

  const paren = [...text.matchAll(/\(([A-Z]{3})\)/g)].map((m) => m[1])
  if (paren.length >= 2) return { origin: paren[0], destination: paren[1] }

  const dash = text.match(/\b([A-Z]{3})\s*-\s*([A-Z]{3})\b/)
  if (dash) return { origin: dash[1], destination: dash[2] }

  return {}
}

/** First time near a departure keyword and first time near an arrival
 * keyword; if neither keyword is present, falls back to "first time found
 * is departure, second is arrival" — the order they'd appear in a normal
 * itinerary or boarding pass. */
export function findFlightTimes(text: string): { departureTime?: string; arrivalTime?: string } {
  const times = findAllTimes(text)
  if (times.length === 0) return {}
  const depRe = /depart(s|ure)?|\bdep\b/i
  const arrRe = /arriv(es|al)?|land(s|ing)?|\barr\b/i
  const departureTime = nearestTimeTo(times, text, depRe, arrRe) ?? times[0]?.time
  const arrivalTime = nearestTimeTo(times, text, arrRe, depRe) ?? (times.length > 1 ? times[1].time : undefined)
  return { departureTime, arrivalTime }
}

export interface ParsedFlight {
  flightIata?: string
  date?: string
  yearInferred: boolean
  origin?: string
  destination?: string
  departureTime?: string
  arrivalTime?: string
}

export function parseFlightText(text: string): ParsedFlight {
  const d = findDate(text)
  const { origin, destination } = findAirportPair(text)
  const { departureTime, arrivalTime } = findFlightTimes(text)
  return {
    flightIata: findFlightNumber(text),
    date: d?.date,
    yearInferred: d?.yearInferred ?? false,
    origin,
    destination,
    departureTime,
    arrivalTime,
  }
}

// ---------------------------------------------------------------------
// Booking-specific extraction
// ---------------------------------------------------------------------

const BOILERPLATE_LINE_RE =
  /\b(booking (confirmation|confirmed|reference|details)|reservation (confirmation|confirmed|details)|order confirmation|e-?ticket|itinerary)\b/i

/** First non-trivial, non-boilerplate line of the pasted text — in most
 * confirmation emails/texts that's the venue/show/activity name, once
 * generic platform headers like "Booking Confirmation" are skipped. Just
 * a starting point; always meant to be reviewed/edited, never trusted
 * blindly. */
export function guessBookingLabel(text: string): string {
  const lines = text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
  const candidate =
    lines.find((l) => l.length >= 3 && !BOILERPLATE_LINE_RE.test(l)) ?? lines.find((l) => l.length >= 3) ?? lines[0] ?? ''
  return candidate.length > 90 ? candidate.slice(0, 90) : candidate
}

const CATEGORY_KEYWORDS: [BookingCategory, RegExp][] = [
  ['flight', /\bflight\b|boarding pass|\bitinerary\b/i],
  ['train', /\btrain\b|\brail\b|shinkansen|eurostar/i],
  ['show', /\bticket|\bshow\b|theatre|theater|concert|matinee|performance/i],
  ['restaurant', /restaurant|reservation|table for|\bdinner\b|\blunch\b|\bbrunch\b/i],
  ['tour', /\btour\b|excursion|admission|attraction|activity/i],
]

export function guessBookingCategory(text: string): BookingCategory {
  for (const [category, re] of CATEGORY_KEYWORDS) {
    if (re.test(text)) return category
  }
  return 'other'
}

export interface ParsedBooking {
  date?: string
  yearInferred: boolean
  time?: string
  label: string
  category: BookingCategory
}

export function parseBookingText(text: string): ParsedBooking {
  const d = findDate(text)
  return {
    date: d?.date,
    yearInferred: d?.yearInferred ?? false,
    time: findAllTimes(text)[0]?.time,
    label: guessBookingLabel(text),
    category: guessBookingCategory(text),
  }
}
