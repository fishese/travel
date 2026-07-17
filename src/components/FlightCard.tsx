import { useCallback, useEffect, useState } from 'react'
import {
  type SavedFlight,
  type FlightStatus,
  readCachedStatus,
  writeCachedStatus,
  readLastAttempt,
  writeLastAttempt,
  fetchFlightStatus,
  isStatusCheckable,
  isFinalStatus,
  minutesToDeparture,
} from '../lib/flights'
import { localDateStr, localTomorrowStr } from '../lib/dateUtils'
import { SwipeToDelete } from './SwipeToDelete'
import { requestOpen } from '../lib/swipeCoordinator'
import { RawTextDisclosure } from './RawTextDisclosure'

interface Props {
  flight: SavedFlight
  apiKey: string
  recordCall: () => void
  quotaCount: number
  quotaLimit: number
  onDelete: (id: string) => void
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
}

function useFlightStatusPolling(
  flight: SavedFlight,
  apiKey: string,
  recordCall: () => void,
  quotaCount: number,
  quotaLimit: number,
) {
  const [status, setStatus] = useState<FlightStatus | null>(() => readCachedStatus(flight.id))
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const checkable = isStatusCheckable(flight.date)
  const quotaExhausted = quotaCount >= quotaLimit

  const doFetch = useCallback(async () => {
    if (!apiKey || !checkable) return
    if (quotaCount >= quotaLimit) {
      setError('Monthly quota reached — try again next month, or check flightaware.com directly.')
      return
    }
    writeLastAttempt(flight.id) // before the call, so a failure still counts toward back-off
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
  }, [apiKey, checkable, flight.flightIata, flight.id, recordCall, quotaCount, quotaLimit])

  // While this card is mounted (i.e. the app is open), re-check every
  // minute whether it's time to fetch — cheap local check, only calls the
  // API once the relevant staleness threshold has actually passed.
  useEffect(() => {
    if (!checkable || !apiKey || quotaExhausted) return

    function maybeFetch() {
      const cached = readCachedStatus(flight.id)
      if (cached && isFinalStatus(cached.flightStatus)) return

      // Back off on repeated failures too, not just successful fetches —
      // whichever happened more recently (a success or just an attempt)
      // is what staleness is measured from.
      const lastSuccess = cached ? new Date(cached.fetchedAt).getTime() : 0
      const lastAttemptRaw = readLastAttempt(flight.id)
      const lastAttempt = lastAttemptRaw ? new Date(lastAttemptRaw).getTime() : 0
      const lastActivity = Math.max(lastSuccess, lastAttempt)

      const mins = minutesToDeparture(cached)
      const staleAfterMs = mins !== null && mins <= 240 ? 15 * 60_000 : 60 * 60_000
      const age = lastActivity ? Date.now() - lastActivity : Infinity
      if (age > staleAfterMs) doFetch()
    }

    maybeFetch()
    const interval = setInterval(maybeFetch, 60_000)
    return () => clearInterval(interval)
  }, [checkable, apiKey, quotaExhausted, flight.id, doFetch])

  return { status, loading, error, refresh: doFetch, checkable, quotaExhausted }
}

export function FlightCard({ flight, apiKey, recordCall, quotaCount, quotaLimit, onDelete }: Props) {
  const { status, loading, error, refresh, checkable, quotaExhausted } = useFlightStatusPolling(
    flight,
    apiKey,
    recordCall,
    quotaCount,
    quotaLimit,
  )

  const today = localDateStr()
  const tomorrow = localTomorrowStr()
  const isToday = flight.date === today
  const isTomorrow = flight.date === tomorrow

  return (
    <SwipeToDelete id={flight.id} label={flight.flightIata || 'flight'} onDelete={() => onDelete(flight.id)}>
      <div className="border border-[var(--color-border)] rounded-lg p-3">
        <div className="flex items-start justify-between">
          <div>
            <p className="font-semibold tabular">{flight.flightIata}</p>
            <p className="text-xs text-[var(--color-muted)]">
              {flight.date}
              {isToday && ' · Today'}
              {isTomorrow && ' · Tomorrow'}
            </p>
            {(flight.origin || flight.destination || flight.departureTime || flight.arrivalTime) && (
              <p className="text-xs text-[var(--color-muted)] tabular">
                {flight.origin ?? '?'} {flight.departureTime ?? ''} → {flight.destination ?? '?'} {flight.arrivalTime ?? ''}
              </p>
            )}
            {flight.notes && <p className="text-xs text-[var(--color-muted)] mt-1">{flight.notes}</p>}
            {flight.rawText && <RawTextDisclosure text={flight.rawText} />}
          </div>
          <button
            type="button"
            onClick={() => requestOpen(flight.id)}
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
                    disabled={loading || quotaExhausted}
                    className="text-[var(--color-pine)] underline disabled:opacity-40"
                  >
                    Refresh
                  </button>
                </div>
              </div>
            )}

            {!status && !loading && !error && (
              <button
                type="button"
                onClick={refresh}
                disabled={quotaExhausted}
                className="text-xs text-[var(--color-pine)] underline disabled:opacity-40"
              >
                Check status
              </button>
            )}
          </div>
        )}
      </div>
    </SwipeToDelete>
  )
}
