export interface GeoLocation {
  lat: number
  lon: number
  label: string
  source: 'ip' | 'gps' | 'manual'
}

/** No permission prompt, no user action needed — used as the low-friction
 * default on first load. Approximate (city-level, sometimes off by tens of
 * km), which is normally fine for a weather forecast but is exactly why
 * this is a starting point, not a substitute for the GPS/manual options. */
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
  }
}

/** Only called on explicit user action (a button tap) — never auto-fired on
 * mount, so the browser's permission prompt never appears as a surprise. */
export function getGPSLocation(): Promise<GeoLocation> {
  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) {
      reject(new Error('Location is not supported on this device/browser.'))
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
          label: 'Current location',
          source: 'gps',
        })
      },
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
}

export interface CitySearchResult {
  label: string
  lat: number
  lon: number
}

/** Nominatim (OpenStreetMap) geocoding — free, no key. Usage policy asks for
 * an identifying User-Agent, which browsers block JS from setting; the
 * Referer header the browser sends automatically satisfies the same
 * identification requirement for this kind of low-volume personal use. */
export async function searchCity(query: string): Promise<CitySearchResult[]> {
  const q = query.trim()
  if (!q) return []
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=5&q=${encodeURIComponent(q)}`
  const res = await fetch(url)
  if (!res.ok) throw new Error('City search failed.')
  const data = (await res.json()) as { display_name: string; lat: string; lon: string }[]
  return data.map((d) => ({
    label: d.display_name,
    lat: parseFloat(d.lat),
    lon: parseFloat(d.lon),
  }))
}
