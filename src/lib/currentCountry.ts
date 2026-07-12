import { useCallback, useSyncExternalStore } from 'react'
import { useSetting } from './useSetting'
import { getCountry } from './countries'
import type { GeoLocation } from './location'

// Manual "peek at another country" override — deliberately NOT persisted
// to localStorage. Refreshing the page or reopening the app always falls
// back to whatever the weather location resolves to; the override only
// lives in memory for the current session, like a scratch note rather
// than a setting. Shared across every component via useSyncExternalStore,
// same reasoning as useSetting — just without the storage backing.
type Listener = () => void
const listeners = new Set<Listener>()
let overrideIso2: string | null = null

function notify() {
  listeners.forEach((l) => l())
}
function subscribe(callback: Listener) {
  listeners.add(callback)
  return () => listeners.delete(callback)
}
function getSnapshot() {
  return overrideIso2
}

export interface CurrentCountry {
  iso2: string
  /** Manually pick a country for this session only. */
  setIso2: (iso2: string) => void
  /** True when the current value came from a manual pick rather than the
   * weather location. */
  isOverridden: boolean
  /** Country the weather location resolves to, if any — available even
   * while overridden, so UI can offer "back to weather location". */
  locationIso2: string
  /** Clears the manual override, reverting to the weather location. */
  useWeatherLocation: () => void
}

export function useCurrentCountry(): CurrentCountry {
  const [location] = useSetting<GeoLocation | null>('travel_weather_location', null)
  const override = useSyncExternalStore(subscribe, getSnapshot)

  const locationIso2 = location?.countryCode && getCountry(location.countryCode) ? location.countryCode : ''
  const iso2 = override !== null ? override : locationIso2

  const setIso2 = useCallback((next: string) => {
    overrideIso2 = next
    notify()
  }, [])

  const useWeatherLocation = useCallback(() => {
    overrideIso2 = null
    notify()
  }, [])

  return { iso2, setIso2, isOverridden: override !== null, locationIso2, useWeatherLocation }
}
