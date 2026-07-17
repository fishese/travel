import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'
import {
  getIPLocation,
  getGPSLocation,
  searchCity,
  type GeoLocation,
  type CitySearchResult,
} from '../lib/location'
import {
  getWeather,
  computeUmbrellaSignal,
  getTonightRainChance,
  type WeatherCache,
} from '../lib/weather'
import { useSetting } from '../lib/useSetting'

const SOURCE_LABEL: Record<GeoLocation['source'], string> = {
  ip: 'via IP (approximate)',
  gps: 'via GPS',
  manual: 'manual',
}

export interface WeatherCardHandle {
  /** Re-fetches the forecast — re-detects GPS/IP location first for those
   * sources (same as the inline 🔄 button), or just re-fetches at the
   * existing coordinates for a manual search pick. Used by the
   * pull-to-refresh gesture on the Dashboard tab. */
  refresh: () => Promise<void>
}

export const WeatherCard = forwardRef<WeatherCardHandle>(function WeatherCard(_props, ref) {
  const [location, setLocation] = useSetting<GeoLocation | null>('travel_weather_location', null)
  const [cache, setCache] = useState<WeatherCache | null>(null)
  const [stale, setStale] = useState(false)
  const [offline, setOffline] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [locating, setLocating] = useState(false)

  const [gpsLoading, setGpsLoading] = useState(false)
  const [ipPickerLoading, setIpPickerLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [query, setQuery] = useState('')
  const [searching, setSearching] = useState(false)
  const [results, setResults] = useState<CitySearchResult[]>([])
  const [pickerOpen, setPickerOpen] = useState(false)

  // First-run-per-load default: silently try IP-based location (no
  // permission prompt) on every mount (page load/refresh) — unless the
  // current location was an explicit choice (GPS or manual search), which
  // should stick until changed again rather than being silently
  // overridden. Uses a ref snapshot of the *initial* source rather than
  // depending on `location` reactively — depending on it directly would
  // re-fire this same effect after its own setLocation call (still
  // source:'ip'), hammering the IP lookup endpoint repeatedly instead of
  // running once per load as intended.
  const initialSourceRef = useRef(location?.source)
  useEffect(() => {
    if (initialSourceRef.current === 'gps' || initialSourceRef.current === 'manual') return
    let cancelled = false
    setLocating(true)
    getIPLocation()
      .then((loc) => {
        if (!cancelled) setLocation(loc)
      })
      .catch(() => {
        // silent — this is just a best-effort default; the picker stays
        // open and GPS/manual search are right there as explicit fallbacks
      })
      .finally(() => {
        if (!cancelled) setLocating(false)
      })
    return () => {
      cancelled = true
    }
  }, [setLocation])

  useEffect(() => {
    if (!location) return
    let cancelled = false
    setLoading(true)
    setError(null)
    getWeather(location.lat, location.lon)
      .then((r) => {
        if (cancelled) return
        setCache(r.cache)
        setStale(r.stale)
        setOffline(r.offline)
      })
      .catch((e: Error) => {
        if (!cancelled) setError(e.message)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [location])

  async function handleUseGPS() {
    setGpsLoading(true)
    setError(null)
    try {
      const loc = await getGPSLocation()
      setLocation(loc)
      setPickerOpen(false)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setGpsLoading(false)
    }
  }

  async function handleUseIP() {
    setIpPickerLoading(true)
    setError(null)
    try {
      const loc = await getIPLocation()
      setLocation(loc)
      setPickerOpen(false)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setIpPickerLoading(false)
    }
  }

  /** Re-runs whatever mechanism produced the current location — GPS stays
   * GPS, IP stays IP — without needing to go into "Change" first. A manual
   * search result has nothing to re-fetch (a picked city's coordinates
   * don't change), so the button is hidden for that source. */
  async function handleRefresh() {
    if (!location || location.source === 'manual') return
    setRefreshing(true)
    setError(null)
    try {
      const loc = location.source === 'gps' ? await getGPSLocation() : await getIPLocation()
      setLocation(loc)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setRefreshing(false)
    }
  }

  /** Re-fetches the forecast at the current coordinates without touching
   * location at all — the manual-search counterpart to handleRefresh
   * above, since a picked city has no "re-detect" step. */
  async function refreshWeatherOnly() {
    if (!location) return
    setLoading(true)
    setError(null)
    try {
      const r = await getWeather(location.lat, location.lon)
      setCache(r.cache)
      setStale(r.stale)
      setOffline(r.offline)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  useImperativeHandle(ref, () => ({
    refresh: async () => {
      if (!location) return
      if (location.source === 'manual') await refreshWeatherOnly()
      else await handleRefresh()
    },
  }))

  async function handleSearch() {
    setSearching(true)
    setError(null)
    try {
      setResults(await searchCity(query))
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setSearching(false)
    }
  }

  function selectCity(r: CitySearchResult) {
    setLocation({ lat: r.lat, lon: r.lon, label: r.label, source: 'manual', countryCode: r.countryCode })
    setResults([])
    setQuery('')
    setPickerOpen(false)
  }

  const showPicker = pickerOpen || !location

  return (
    <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3 shadow-sm mt-2">
      {location && !showPicker && (
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold truncate pr-2">
            {location.label}
            <span className="text-xs font-normal text-[var(--color-muted)]"> · {SOURCE_LABEL[location.source]}</span>
          </h2>
          <div className="flex items-center gap-2 shrink-0">
            {location.source !== 'manual' && (
              <button
                type="button"
                onClick={handleRefresh}
                disabled={refreshing}
                aria-label="Refresh location"
                className="text-[var(--color-pine)] disabled:opacity-40"
              >
                {refreshing ? '…' : '🔄'}
              </button>
            )}
            <button
              type="button"
              onClick={() => setPickerOpen(true)}
              className="text-xs text-[var(--color-pine)] underline"
            >
              Change
            </button>
          </div>
        </div>
      )}

      {!location && locating && (
        <p className="text-sm text-[var(--color-muted)] mb-2">Finding your approximate location…</p>
      )}

      {showPicker && (
        <div className="space-y-2 mb-2">
          <button
            type="button"
            onClick={handleUseGPS}
            disabled={gpsLoading}
            className="w-full rounded-lg bg-[var(--color-pine)] text-white px-3 py-2 text-sm disabled:opacity-50"
          >
            {gpsLoading ? 'Getting location…' : '📍 Use my location'}
          </button>

          <button
            type="button"
            onClick={handleUseIP}
            disabled={ipPickerLoading}
            className="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm disabled:opacity-50"
          >
            {ipPickerLoading ? 'Looking up…' : '🌐 Use approximate location (IP)'}
          </button>

          <div className="flex flex-wrap gap-2">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="or search a city…"
              className="flex-1 min-w-0 rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm"
            />
            <button
              type="button"
              onClick={handleSearch}
              disabled={searching || !query.trim()}
              className="rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm disabled:opacity-40"
            >
              {searching ? '…' : 'Search'}
            </button>
          </div>

          {results.length > 0 && (
            <ul className="rounded-lg border border-[var(--color-border)] divide-y divide-[var(--color-border)]">
              {results.map((r) => (
                <li key={`${r.lat},${r.lon}`}>
                  <button
                    type="button"
                    onClick={() => selectCity(r)}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-[var(--color-amber-dim)]"
                  >
                    {r.label}
                  </button>
                </li>
              ))}
            </ul>
          )}

          {location && (
            <button
              type="button"
              onClick={() => setPickerOpen(false)}
              className="text-xs text-[var(--color-muted)] underline"
            >
              Cancel
            </button>
          )}
        </div>
      )}

      {error && <p className="text-sm text-[var(--color-amber)] mb-2">{error}</p>}

      {location && loading && !cache && (
        <p className="text-sm text-[var(--color-muted)]">Fetching forecast…</p>
      )}

      {cache && !showPicker && <WeatherSummary cache={cache} />}

      {cache && !showPicker && (
        <p className="text-xs text-[var(--color-muted)] mt-2">
          {offline ? 'Offline · ' : ''}
          {stale ? 'Stale · ' : ''}
          as of{' '}
          {new Date(cache.fetchedAt).toLocaleString(undefined, {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </p>
      )}
    </section>
  )
})

function WeatherSummary({ cache }: { cache: WeatherCache }) {
  const umbrella = computeUmbrellaSignal(cache)
  const tonightRain = getTonightRainChance(cache)
  const todayHigh = cache.daily.temperature_2m_max[0]
  const todayLow = cache.daily.temperature_2m_min[0]
  const tomorrowRain = cache.daily.precipitation_probability_max[1]

  return (
    <div>
      <div className="rounded-xl bg-[var(--color-pine-dim)] px-3 py-3 mb-2">
        <p className="text-xl font-display">
          {umbrella.bringUmbrella ? `🌂 Bring an umbrella` : '☀️ Dry for the next couple hours'}
        </p>
        {umbrella.bringUmbrella && umbrella.atHour && (
          <p className="text-xs text-[var(--color-muted)] mt-1">Rain chance rising by {umbrella.atHour}</p>
        )}
      </div>

      <div className="grid grid-cols-3 gap-2 text-sm text-center">
        <div>
          <p className="text-xs text-[var(--color-muted)]">Today</p>
          <p className="tabular font-semibold">
            {Math.round(todayHigh)}° / {Math.round(todayLow)}°
          </p>
        </div>
        <div>
          <p className="text-xs text-[var(--color-muted)]">Tonight</p>
          <p className="tabular font-semibold">{tonightRain !== null ? `${Math.round(tonightRain)}%` : '—'}</p>
        </div>
        <div>
          <p className="text-xs text-[var(--color-muted)]">Tomorrow</p>
          <p className="tabular font-semibold">
            {tomorrowRain !== undefined ? `${Math.round(tomorrowRain)}%` : '—'}
          </p>
        </div>
      </div>
    </div>
  )
}
