import type { SensitiveKind } from './sensitive'

/** Categories match saved bookings, including car rental. */
export type ImportBookingCategory = 'flight' | 'train' | 'tour' | 'restaurant' | 'show' | 'car' | 'other'

export interface DraftFlight {
  flightIata: string
  date: string
  origin: string
  destination: string
  departureTime: string
  arrivalTime: string
  arrivalDate: string
  notes: string
  warnings: string[]
  yearInferred: boolean
}

export interface DraftHotel {
  name: string
  city: string
  address: string
  phone: string
  checkIn: string
  checkOut: string
  notes: string
  warnings: string[]
}

export interface DraftBooking {
  category: ImportBookingCategory
  label: string
  date: string
  time: string
  notes: string
  warnings: string[]
  yearInferred: boolean
}

export interface ParsedImport {
  flights: DraftFlight[]
  hotels: DraftHotel[]
  bookings: DraftBooking[]
  warnings: string[]
  sensitive: SensitiveKind[]
  /** Redacted source, capped so a huge paste cannot fill localStorage. */
  rawText: string
  /** True when the source looked like a passport, card, or security code. */
  suggestVault: boolean
}

export type ImportParseResult = { ok: true; preview: ParsedImport } | { ok: false; error: string }

export const RAW_TEXT_CAP = 20_000
