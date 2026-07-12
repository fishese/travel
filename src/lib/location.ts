export interface GeoLocation {
  lat: number
  lon: number
  label: string
  source: 'ip' | 'gps' | 'manual'
  /** ISO 3166-1 alpha-2, uppercase, when it could be determined — drives
   * auto-selecting the matching country elsewhere in the app (see
   * useSyncCountryFromLocation in lib/currentCountry.ts). */
  countryCode?: string
}

/** No permission prompt, no user action needed — used as the low-friction
 * default on first load. Approximate (city-level, sometimes off by tens of
 * km, and shows the VPN's location if one is active), which is normally
 * fine for a weather forecast but is exactly why this is a starting point,
 * not a substitute for the GPS/manual options. */
export async function getIPLocation(): Promise<GeoLocation> {
  const res = await fetch('https://ipapi.co/json/')
  if (!res.ok) throw new Error('IP location lookup failed.')
  const data = await res.json()
  if (data.error) throw new Error(data.reason || 'IP location lookup failed.')
  if (typeof data.latitude !== 'number' || typeof data.longitude !== 'number') {
    throw new Error('IP location lookup returned no coordinates.')
  }
  const label = [data.city, data.country_name].filter(Boolean).join(', ')
  return {
    lat: data.latitude,
    lon: data.longitude,
    label: label || 'Approximate location',
    source: 'ip',
    countryCode: typeof data.country_code === 'string' ? data.country_code.toUpperCase() : undefined,
  }
}

interface ReverseGeocodeResult {
  label: string
  countryCode?: string
}

/** zoom=10 asks Nominatim for city-level granularity — not street/building
 * level, which we don't need and is less consistently available. */
async function reverseGeocode(lat: number, lon: number): Promise<ReverseGeocodeResult> {
  const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&addressdetails=1&zoom=10`
  const res = await fetch(url)
  if (!res.ok) throw new Error('Reverse geocoding failed.')
  const data = await res.json()
  const addr = data.address ?? {}
  const place = addr.city || addr.town || addr.village || addr.suburb || addr.county
  const country = addr.country
  const label = [place, country].filter(Boolean).join(', ')
  return {
    label: label || data.display_name || 'Current location',
    countryCode: typeof addr.country_code === 'string' ? addr.country_code.toUpperCase() : undefined,
  }
}

/** Only called on explicit user action (a button tap) — never auto-fired on
 * mount, so the browser's permission prompt never appears as a surprise. */
export async function getGPSLocation(): Promise<GeoLocation> {
  const position = await new Promise<GeolocationPosition>((resolve, reject) => {
    if (!('geolocation' in navigator)) {
      reject(new Error('Location is not supported on this device/browser.'))
      return
    }
    navigator.geolocation.getCurrentPosition(
      resolve,
      (err) => {
        const message =
          err.code === err.PERMISSION_DENIED
            ? 'Location permission denied — search for a city instead.'
            : 'Could not get your location — search for a city instead.'
        reject(new Error(message))
      },
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 5 * 60 * 1000 },
    )
  })

  const lat = position.coords.latitude
  const lon = position.coords.longitude

  try {
    const geo = await reverseGeocode(lat, lon)
    return { lat, lon, label: geo.label, source: 'gps', countryCode: geo.countryCode }
  } catch {
    // Coordinates are still good even if turning them into a place name
    // failed (e.g. Nominatim briefly unreachable) — degrade gracefully
    // rather than losing the GPS fix entirely.
    return { lat, lon, label: 'Current location', source: 'gps' }
  }
}

export interface CitySearchResult {
  label: string
  lat: number
  lon: number
  countryCode?: string
}

/** Nominatim (OpenStreetMap) geocoding — free, no key. Usage policy asks for
 * an identifying User-Agent, which browsers block JS from setting; the
 * Referer header the browser sends automatically satisfies the same
 * identification requirement for this kind of low-volume personal use. */
export async function searchCity(query: string): Promise<CitySearchResult[]> {
  const q = query.trim()
  if (!q) return []
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=5&addressdetails=1&q=${encodeURIComponent(q)}`
  const res = await fetch(url)
  if (!res.ok) throw new Error('City search failed.')
  const data = (await res.json()) as {
    display_name: string
    lat: string
    lon: string
    address?: { country_code?: string }
  }[]
  return data.map((d) => ({
    label: d.display_name,
    lat: parseFloat(d.lat),
    lon: parseFloat(d.lon),
    countryCode: d.address?.country_code ? d.address.country_code.toUpperCase() : undefined,
  }))
}
