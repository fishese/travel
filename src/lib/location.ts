export interface GeoLocation {
  lat: number
  lon: number
  label: string
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
