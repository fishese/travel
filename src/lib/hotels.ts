import { useSetting } from './useSetting'

export interface SavedHotel {
  id: string
  name: string
  city: string
  address: string
  phone: string
  checkIn?: string // YYYY-MM-DD
  checkOut?: string // YYYY-MM-DD
  notes: string // freeform: room #, WiFi, checkout time, how to get there
  lat?: number
  lon?: number
  mapsUrl?: string
  osmPlaceId?: string
  savedAt: string

  // Same forward-looking fields as Booking (lib/bookings.ts) — not used
  // yet, but the shape is ready for a future paste/upload parser.
  source: 'manual' | 'pasted' | 'uploaded'
  rawText?: string
}

// Stable module-level reference — useSetting's setter/getSnapshot
// memoization keys off this by identity, so a fresh `[]` literal here would
// silently defeat it on every render (see useSetting.ts's header comment).
const EMPTY_HOTELS: SavedHotel[] = []

export function useSavedHotels() {
  return useSetting<SavedHotel[]>('travel_hotels', EMPTY_HOTELS)
}

function makeId() {
  return Math.random().toString(36).slice(2, 9)
}

function buildMapsUrl(address: string, lat?: number, lon?: number): string {
  if (lat !== undefined && lon !== undefined) {
    return `https://www.google.com/maps/search/?api=1&query=${lat},${lon}`
  }
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`
}

/** Pure construction function, kept separate from any form UI for the same
 * reason as newBooking() in lib/bookings.ts — a future parser populates
 * this the same way the manual form does. */
export function newHotel(fields: {
  name: string
  city: string
  address?: string
  phone?: string
  checkIn?: string
  checkOut?: string
  notes?: string
  lat?: number
  lon?: number
  osmPlaceId?: string
  source?: SavedHotel['source']
  rawText?: string
}): SavedHotel {
  const address = fields.address?.trim() ?? ''
  return {
    id: makeId(),
    name: fields.name.trim(),
    city: fields.city.trim(),
    address,
    phone: fields.phone?.trim() ?? '',
    checkIn: fields.checkIn || undefined,
    checkOut: fields.checkOut || undefined,
    notes: fields.notes?.trim() ?? '',
    lat: fields.lat,
    lon: fields.lon,
    mapsUrl: address || (fields.lat !== undefined && fields.lon !== undefined) ? buildMapsUrl(address, fields.lat, fields.lon) : undefined,
    osmPlaceId: fields.osmPlaceId,
    savedAt: new Date().toISOString(),
    source: fields.source ?? 'manual',
    rawText: fields.rawText,
  }
}

export interface HotelLookupResult {
  label: string
  address: string
  lat: number
  lon: number
  phone?: string
  osmPlaceId: string
}

/** Nominatim search scoped to "name, city" — same service and identification
 * approach as lib/location.ts's searchCity, just a different query shape
 * and pulling a couple of extra tags (phone) when Nominatim has them. */
export async function lookupHotel(name: string, city: string): Promise<HotelLookupResult[]> {
  const q = [name, city].filter((s) => s.trim()).join(', ')
  if (!q.trim()) return []
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=5&addressdetails=1&extratags=1&q=${encodeURIComponent(q)}`
  const res = await fetch(url)
  if (!res.ok) throw new Error('Hotel lookup failed.')
  const data = (await res.json()) as {
    place_id: number
    display_name: string
    lat: string
    lon: string
    extratags?: { phone?: string; ['contact:phone']?: string }
  }[]
  return data.map((d) => ({
    label: d.display_name,
    address: d.display_name,
    lat: parseFloat(d.lat),
    lon: parseFloat(d.lon),
    phone: d.extratags?.phone ?? d.extratags?.['contact:phone'],
    osmPlaceId: String(d.place_id),
  }))
}
