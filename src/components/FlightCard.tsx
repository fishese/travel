import { useCallback, useEffect, useState } from 'react'
import {
  type SavedFlight,
  type FlightStatus,
  readCachedStatus,
  writeCachedStatus,
  fetchFlightStatus,
  isStatusCheckable,
  isFinalStatus,
  minutesToDeparture,
} from '../lib/flights'
import { localDateStr, localTomorrowStr } from '../lib/dateUtils'

interface Props {
  flight: SavedFlight
  apiKey: string
  recordCall: () => void
  onDelete: (id: string) => void
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
}

function useFlightStatusPolling(flight: SavedFlight, apiKey: string, recordCall: () => void) {
  const [status, setStatus] = useState<FlightStatus | null>(() => readCachedStatus(flight.id))
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const checkable = isStatusCheckable(flight.date)

  const doFetch = useCallback(async () => {
    if (!apiKey || !checkable) return
    setLoading(true)
    setError(null)
    try {
      const fresh = await fetchFlightStatus(apiKey, flight.flightIata, recordCall)
      writeCachedStatus(flight.id, fresh)
      setStatus(fresh)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }, [apiKey, checkable, flight.flightIata, flight.id, recordCall])

  // While this card is mounted (i.e. the app is open), re-check every
  // minute whether it's time to fetch — cheap local check, only calls the
  // API once the relevant staleness threshold has actually passed.
  useEffect(() => {
    if (!checkable || !apiKey) return

    function maybeFetch() {
      const cached = readCachedStatus(flight.id)
      if (cached && isFinalStatus(cached.flightStatus)) return
      const mins = minutesToDeparture(cached)
      const staleAfterMs = mins !== null && mins <= 240 ? 15 * 60_000 : 60 * 60_000
      const age = cached ? Date.now() - new Date(cached.fetchedAt).getTime() : Infinity
      if (age > staleAfterMs) doFetch()
    }

    maybeFetch()
    const interval = setInterval(maybeFetch, 60_000)
    return () => clearInterval(interval)
  }, [checkable, apiKey, flight.id, doFetch])

  return { status, loading, error, refresh: doFetch, checkable }
}

export function FlightCard({ flight, apiKey, recordCall, onDelete }: Props) {
  const { status, loading, error, refresh, checkable } = useFlightStatusPolling(flight, apiKey, recordCall)

  const today = localDateStr()
  const tomorrow = localTomorrowStr()
  const isToday = flight.date === today
  const isTomorrow = flight.date === tomorrow

  return (
    <div className="rounded-lg border border-[var(--color-border)] p-3">
      <div className="flex items-start justify-between">
        <div>
          <p className="font-semibold tabular">{flight.flightIata}</p>
          <p className="text-xs text-[var(--color-muted)]">
            {flight.date}
            {isToday && ' · Today'}
            {isTomorrow && ' · Tomorrow'}
          </p>
          {flight.notes && <p className="text-xs text-[var(--color-muted)] mt-1">{flight.notes}</p>}
        </div>
        <button
          type="button"
          onClick={() => onDelete(flight.id)}
          className="text-xs text-[var(--color-amber)] shrink-0"
        >
          Remove
        </button>
      </div>

      {!checkable && (
        <p className="text-xs text-[var(--color-muted)] mt-2">
          Status available on departure day — the free API tier doesn't cover future lookups.
        </p>
      )}

      {checkable && !apiKey && (
        <p className="text-xs text-[var(--color-muted)] mt-2">Add an Aviationstack API key above to see live status.</p>
      )}

      {checkable && apiKey && (
        <div className="mt-2">
          {loading && !status && <p className="text-xs text-[var(--color-muted)]">Checking status…</p>}
          {error && <p className="text-xs text-[var(--color-amber)]">{error}</p>}

          {status && (
            <div className="text-sm space-y-0.5">
              <p className="font-medium capitalize">
                {status.flightStatus}
                {status.departure.delayMinutes ? ` · +${status.departure.delayMinutes}min` : ''}
              </p>
              <p className="tabular text-xs text-[var(--color-muted)]">
                {status.departure.iata} → {status.arrival.iata}
                {status.departure.terminal && ` · Terminal ${status.departure.terminal}`}
                {status.departure.gate && ` · Gate ${status.departure.gate}`}
              </p>
              {status.departure.scheduled && (
                <p className="tabular text-xs text-[var(--color-muted)]">
                  Departs {fmtTime(status.departure.scheduled)}
                  {status.departure.estimated &&
                    status.departure.estimated !== status.departure.scheduled &&
                    ` (est. ${fmtTime(status.departure.estimated)})`}
                </p>
              )}
              <div className="flex items-center justify-between text-xs text-[var(--color-muted)] mt-1">
                <span>Last checked {fmtTime(status.fetchedAt)}</span>
                <button
                  type="button"
                  onClick={refresh}
                  disabled={loading}
                  className="text-[var(--color-pine)] underline disabled:opacity-40"
                >
                  Refresh
                </button>
              </div>
            </div>
          )}

          {!status && !loading && !error && (
            <button type="button" onClick={refresh} className="text-xs text-[var(--color-pine)] underline">
              Check status
            </button>
          )}
        </div>
      )}
    </div>
  )
}
