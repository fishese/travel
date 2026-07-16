import { useCallback } from 'react'
import { useSetting } from './useSetting'
import { localDateStr, localMonthStr } from './dateUtils'

export interface SavedFlight {
  id: string
  flightIata: string // e.g. "CX500"
  date: string // YYYY-MM-DD, local to however the person entered it
  origin?: string // IATA code, e.g. "HKG" — for labeling which timezone departureTime is in
  destination?: string // IATA code, e.g. "NRT" — for labeling which timezone arrivalTime is in
  departureTime?: string // HH:mm, local to origin
  arrivalTime?: string // HH:mm, local to destination — overnight arrivals (next calendar day) aren't tracked separately, a known v1 limitation
  notes?: string
  savedAt: string
}

export function useSavedFlights() {
  return useSetting<SavedFlight[]>('travel_flights', [])
}

function makeId() {
  return Math.random().toString(36).slice(2, 9)
}

export function newFlight(fields: {
  flightIata: string
  date: string
  origin?: string
  destination?: string
  departureTime?: string
  arrivalTime?: string
  notes?: string
}): SavedFlight {
  return {
    id: makeId(),
    flightIata: fields.flightIata.toUpperCase().replace(/\s+/g, ''),
    date: fields.date,
    origin: fields.origin?.trim().toUpperCase() || undefined,
    destination: fields.destination?.trim().toUpperCase() || undefined,
    departureTime: fields.departureTime || undefined,
    arrivalTime: fields.arrivalTime || undefined,
    notes: fields.notes?.trim() || undefined,
    savedAt: new Date().toISOString(),
  }
}

// ---- API key + quota (shared across all flights) ----

export function useAviationstackKey() {
  return useSetting('travel_aviationstack_key', '')
}

const QUOTA_LIMIT = 100

export function useFlightApiQuota() {
  const [count, setCount] = useSetting('travel_flight_api_count', 0)
  const [month, setMonth] = useSetting('travel_flight_api_month', '')

  const currentMonth = localMonthStr() // "2026-07"
  const effectiveCount = month === currentMonth ? count : 0

  // Deliberately depends on `month` (changes at most once a month) and NOT
  // on `count` (changes on every single call) — including count here would
  // silently reintroduce the exact bug this fixes: recordCall recreated on
  // every call, cascading through doFetch's useCallback into the polling
  // effect's deps, re-triggering an immediate fetch each time. setCount
  // uses the functional-update form specifically so it never needs to
  // close over the current count value at all.
  const recordCall = useCallback(() => {
    if (month !== currentMonth) {
      setMonth(currentMonth)
      setCount(1)
    } else {
      setCount((c) => c + 1)
    }
  }, [month, currentMonth, setCount, setMonth])

  const resetCount = useCallback(() => {
    setMonth(currentMonth)
    setCount(0)
  }, [currentMonth, setCount, setMonth])

  return { count: effectiveCount, limit: QUOTA_LIMIT, recordCall, resetCount }
}

// ---- Status fetch + per-flight cache ----

export interface FlightStatus {
  fetchedAt: string
  flightStatus: string // scheduled | active | landed | cancelled | incident | diverted
  airlineName: string | null
  departure: {
    airport: string
    iata: string
    terminal: string | null
    gate: string | null
    scheduled: string | null // ISO
    estimated: string | null
    delayMinutes: number | null
  }
  arrival: {
    airport: string
    iata: string
    scheduled: string | null
    estimated: string | null
  }
}

function cacheKey(flightId: string) {
  return `travel_flight_status_${flightId}`
}

export function readCachedStatus(flightId: string): FlightStatus | null {
  const raw = localStorage.getItem(cacheKey(flightId))
  if (!raw) return null
  try {
    return JSON.parse(raw) as FlightStatus
  } catch {
    return null
  }
}

export function writeCachedStatus(flightId: string, status: FlightStatus) {
  localStorage.setItem(cacheKey(flightId), JSON.stringify(status))
}

function lastAttemptKey(flightId: string) {
  return `travel_flight_last_attempt_${flightId}`
}

/** Tracks every attempt — success or failure — separately from the
 * last-successful cache above. Without this, a flight number that keeps
 * erroring (wrong number, no data published, etc.) never has a "last
 * fetched" timestamp to check staleness against, so the polling logic sees
 * an infinitely-stale cache and retries on every single interval tick
 * forever instead of backing off like a successful fetch would. */
export function readLastAttempt(flightId: string): string | null {
  return localStorage.getItem(lastAttemptKey(flightId))
}

export function writeLastAttempt(flightId: string) {
  localStorage.setItem(lastAttemptKey(flightId), new Date().toISOString())
}

/** True once real-time data could plausibly exist for this flight — the
 * free Aviationstack plan only serves today's flights; historical and
 * future-schedule lookups are paid-only features. */
export function isStatusCheckable(dateStr: string): boolean {
  const today = localDateStr()
  return dateStr === today
}

export function isFinalStatus(status: string): boolean {
  return status === 'landed' || status === 'cancelled'
}

/** Minutes until this flight's scheduled departure, or null if unknown. */
export function minutesToDeparture(status: FlightStatus | null): number | null {
  const scheduled = status?.departure.scheduled
  if (!scheduled) return null
  return Math.round((new Date(scheduled).getTime() - Date.now()) / 60_000)
}

export async function fetchFlightStatus(
  apiKey: string,
  flightIata: string,
  recordCall: () => void,
): Promise<FlightStatus> {
  // "Today" here means the browser's local date, which matches the flight's
  // actual date in the overwhelmingly common case (checking a flight from
  // wherever you currently are). It can still be wrong in the edge case of
  // checking a flight departing a very different timezone while the
  // browser's clock is on a different one — there's no way to know the
  // departure airport's timezone before the first successful response,
  // which is exactly what tells us it. Not solved, just narrowed from "off
  // by a day in Hong Kong every morning" to "off only in that narrower case".
  const today = localDateStr()
  const url =
    `https://api.aviationstack.com/v1/flights?access_key=${encodeURIComponent(apiKey)}` +
    `&flight_iata=${encodeURIComponent(flightIata)}&flight_date=${today}`
  const res = await fetch(url)
  recordCall() // count it even on a non-2xx response — it still consumed quota
  if (!res.ok) throw new Error(`Aviationstack request failed (${res.status}).`)
  const data = await res.json()
  if (data.error) {
    throw new Error(data.error.message || 'Aviationstack request failed.')
  }
  const flight = data.data?.[0]
  if (!flight) {
    throw new Error('No data for this flight today — check the flight number, or it may not be published yet.')
  }

  const status: FlightStatus = {
    fetchedAt: new Date().toISOString(),
    flightStatus: flight.flight_status,
    airlineName: flight.airline?.name ?? null,
    departure: {
      airport: flight.departure?.airport ?? '',
      iata: flight.departure?.iata ?? '',
      terminal: flight.departure?.terminal ?? null,
      gate: flight.departure?.gate ?? null,
      scheduled: flight.departure?.scheduled ?? null,
      estimated: flight.departure?.estimated ?? null,
      delayMinutes: flight.departure?.delay ?? null,
    },
    arrival: {
      airport: flight.arrival?.airport ?? '',
      iata: flight.arrival?.iata ?? '',
      scheduled: flight.arrival?.scheduled ?? null,
      estimated: flight.arrival?.estimated ?? null,
    },
  }
  return status
}
