// Weather: fetched when online, cached for offline use. Deliberately uses
// only hourly-resolution data (not Open-Meteo's minutely_15) — 15-minute
// precipitation is only natively modeled for Central Europe and North
// America; everywhere else (most of the destinations this app actually
// covers) it's just interpolated from hourly data anyway, so claiming
// minute-level precision there would be misleading. Hourly data is
// consistent quality worldwide.

const CACHE_KEY = 'travel_weather_cache_v1'
const STALE_AFTER_MS = 2 * 60 * 60 * 1000 // 2h — weather goes stale faster than FX rates
const SAME_LOCATION_TOLERANCE_DEG = 0.05 // ~5km

export interface WeatherCache {
  lat: number
  lon: number
  fetchedAt: string // ISO 8601
  timezone: string
  hourly: {
    time: string[]
    precipitation_probability: number[]
    temperature_2m: number[]
  }
  daily: {
    time: string[]
    temperature_2m_max: number[]
    temperature_2m_min: number[]
    precipitation_probability_max: number[]
    precipitation_sum: number[]
  }
}

function readCache(): WeatherCache | null {
  const raw = localStorage.getItem(CACHE_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as WeatherCache
  } catch {
    return null
  }
}

function writeCache(cache: WeatherCache) {
  localStorage.setItem(CACHE_KEY, JSON.stringify(cache))
}

export function isWeatherStale(cache: WeatherCache | null): boolean {
  if (!cache) return true
  return Date.now() - new Date(cache.fetchedAt).getTime() > STALE_AFTER_MS
}

function sameLocation(a: WeatherCache, lat: number, lon: number): boolean {
  return (
    Math.abs(a.lat - lat) < SAME_LOCATION_TOLERANCE_DEG &&
    Math.abs(a.lon - lon) < SAME_LOCATION_TOLERANCE_DEG
  )
}

/**
 * Fetch a 2-day forecast for the given coordinates. On network failure,
 * falls back to the last cached forecast if it's for roughly the same
 * place — otherwise throws, since a forecast for a different city isn't
 * useful even if it's all we have.
 */
export async function getWeather(
  lat: number,
  lon: number,
): Promise<{ cache: WeatherCache; stale: boolean; offline: boolean }> {
  const cached = readCache()

  try {
    const url =
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
      `&hourly=precipitation_probability,temperature_2m` +
      `&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,precipitation_sum` +
      `&timezone=auto&forecast_days=2`
    const res = await fetch(url)
    if (!res.ok) throw new Error(`open-meteo ${res.status}`)
    const data = await res.json()
    const fresh: WeatherCache = {
      lat,
      lon,
      fetchedAt: new Date().toISOString(),
      timezone: data.timezone,
      hourly: data.hourly,
      daily: data.daily,
    }
    writeCache(fresh)
    return { cache: fresh, stale: false, offline: false }
  } catch {
    if (cached && sameLocation(cached, lat, lon)) {
      return { cache: cached, stale: isWeatherStale(cached), offline: true }
    }
    throw new Error('No network and no cached forecast for this location.')
  }
}

export interface UmbrellaSignal {
  bringUmbrella: boolean
  atHour?: string // "15:00", local to the forecast location
}

/** Looks at the next 2 hours from now; recommends an umbrella if any of
 * them has a >60% precipitation chance. */
export function computeUmbrellaSignal(cache: WeatherCache): UmbrellaSignal {
  const nowMs = Date.now()
  const startIdx = cache.hourly.time.findIndex((t) => new Date(t).getTime() >= nowMs)
  if (startIdx === -1) return { bringUmbrella: false }

  const endIdx = Math.min(startIdx + 2, cache.hourly.time.length)
  for (let i = startIdx; i < endIdx; i++) {
    if (cache.hourly.precipitation_probability[i] > 60) {
      return { bringUmbrella: true, atHour: cache.hourly.time[i].slice(11, 16) }
    }
  }
  return { bringUmbrella: false }
}

/** Max rain chance between 18:00–23:00 on the forecast's "today" (its own
 * local date, from timezone=auto) — a lightweight stand-in for "tonight"
 * without needing a separate evening-specific API field. */
export function getTonightRainChance(cache: WeatherCache): number | null {
  if (cache.daily.time.length === 0) return null
  const today = cache.daily.time[0]
  let max: number | null = null
  for (let i = 0; i < cache.hourly.time.length; i++) {
    const t = cache.hourly.time[i]
    if (!t.startsWith(today)) continue
    const hour = Number(t.slice(11, 13))
    if (hour >= 18 && hour <= 23) {
      const p = cache.hourly.precipitation_probability[i]
      if (max === null || p > max) max = p
    }
  }
  return max
}
