import { useState } from 'react'
import { useSavedFlights, useAviationstackKey, useFlightApiQuota, newFlight } from '../lib/flights'
import { localDateStr } from '../lib/dateUtils'
import { FlightCard } from './FlightCard'
import { Collapsible } from './Collapsible'

interface Props {
  onMoveUp?: () => void
  onMoveDown?: () => void
}

export function FlightsSection({ onMoveUp, onMoveDown }: Props) {
  const [flights, setFlights] = useSavedFlights()
  const [apiKey, setApiKey] = useAviationstackKey()
  const quota = useFlightApiQuota()

  const [keyInput, setKeyInput] = useState(apiKey)
  const [showKeyInput, setShowKeyInput] = useState(!apiKey)
  const [confirmingReset, setConfirmingReset] = useState(false)

  const [flightIataInput, setFlightIataInput] = useState('')
  const [dateInput, setDateInput] = useState(() => localDateStr())
  const [originInput, setOriginInput] = useState('')
  const [destinationInput, setDestinationInput] = useState('')
  const [departureTimeInput, setDepartureTimeInput] = useState('')
  const [arrivalTimeInput, setArrivalTimeInput] = useState('')
  const [notesInput, setNotesInput] = useState('')

  function addFlight() {
    if (!flightIataInput.trim()) return
    setFlights((prev) => [
      ...prev,
      newFlight({
        flightIata: flightIataInput,
        date: dateInput,
        origin: originInput,
        destination: destinationInput,
        departureTime: departureTimeInput,
        arrivalTime: arrivalTimeInput,
        notes: notesInput,
      }),
    ])
    setFlightIataInput('')
    setOriginInput('')
    setDestinationInput('')
    setDepartureTimeInput('')
    setArrivalTimeInput('')
    setNotesInput('')
  }

  function removeFlight(id: string) {
    setFlights((prev) => prev.filter((f) => f.id !== id))
  }

  const sorted = [...flights].sort((a, b) => a.date.localeCompare(b.date))

  return (
    <Collapsible id="flights" title="Flights" onMoveUp={onMoveUp} onMoveDown={onMoveDown}>
      {showKeyInput ? (
        <div className="mb-2 space-y-1">
          <p className="text-xs text-[var(--color-muted)]">
            Optional — live status checks need a free Aviationstack key (100 requests/month, day-of-departure only).{' '}
            <a
              href="https://aviationstack.com/signup/free"
              target="_blank"
              rel="noreferrer"
              className="text-[var(--color-pine)] underline"
            >
              Get one
            </a>
            . Reminders below work without it.
          </p>
          <div className="flex flex-wrap gap-2">
            <input
              value={keyInput}
              onChange={(e) => setKeyInput(e.target.value)}
              placeholder="API key"
              className="flex-1 min-w-0 rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm"
            />
            <button
              type="button"
              onClick={() => {
                setApiKey(keyInput.trim())
                setShowKeyInput(false)
              }}
              className="rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm"
            >
              Save
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between mb-2 text-xs text-[var(--color-muted)]">
          <span className="tabular">
            Flight data: {quota.count}/{quota.limit} this month
          </span>
          <div className="flex items-center gap-2">
            {quota.count > 0 && (
              <button
                type="button"
                onClick={() => {
                  if (!confirmingReset) {
                    setConfirmingReset(true)
                    setTimeout(() => setConfirmingReset(false), 3000)
                    return
                  }
                  quota.resetCount()
                  setConfirmingReset(false)
                }}
                className={confirmingReset ? 'text-[var(--color-amber)]' : 'text-[var(--color-pine)] underline'}
              >
                {confirmingReset ? 'Tap again to reset' : 'Reset count'}
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                setKeyInput(apiKey)
                setShowKeyInput(true)
              }}
              className="text-[var(--color-pine)] underline"
            >
              Change key
            </button>
          </div>
        </div>
      )}

      <div className="space-y-2 mb-2 pb-2 border-b border-dashed border-[var(--color-border)]">
        <div className="flex flex-wrap gap-2">
          <input
            value={flightIataInput}
            onChange={(e) => setFlightIataInput(e.target.value)}
            placeholder="Flight # (e.g. CX500)"
            className="flex-1 min-w-0 rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm"
          />
          <input
            type="date"
            value={dateInput}
            onChange={(e) => setDateInput(e.target.value)}
            className="flex-1 min-w-0 rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <input
            value={originInput}
            onChange={(e) => setOriginInput(e.target.value)}
            placeholder="From (e.g. HKG, optional)"
            className="flex-1 min-w-0 rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm"
          />
          <input
            type="time"
            value={departureTimeInput}
            onChange={(e) => setDepartureTimeInput(e.target.value)}
            aria-label="Departure time, local to origin"
            className="flex-1 min-w-0 rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <input
            value={destinationInput}
            onChange={(e) => setDestinationInput(e.target.value)}
            placeholder="To (e.g. NRT, optional)"
            className="flex-1 min-w-0 rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm"
          />
          <input
            type="time"
            value={arrivalTimeInput}
            onChange={(e) => setArrivalTimeInput(e.target.value)}
            aria-label="Arrival time, local to destination"
            className="flex-1 min-w-0 rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm"
          />
        </div>
        <p className="text-xs text-[var(--color-muted)]">
          Departure/arrival times are each local to their own airport — enter what your boarding pass shows, no
          conversion needed.
        </p>

        <input
          value={notesInput}
          onChange={(e) => setNotesInput(e.target.value)}
          placeholder="Notes (optional)"
          className="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm"
        />
        <button
          type="button"
          onClick={addFlight}
          disabled={!flightIataInput.trim()}
          className="w-full rounded-lg bg-[var(--color-pine)] text-white px-3 py-2 text-sm disabled:opacity-50"
        >
          Add flight
        </button>
      </div>

      {sorted.length === 0 ? (
        <p className="text-sm text-[var(--color-muted)]">No flights saved yet.</p>
      ) : (
        <div className="space-y-2">
          {sorted.map((f) => (
            <FlightCard
              key={f.id}
              flight={f}
              apiKey={apiKey}
              recordCall={quota.recordCall}
              quotaCount={quota.count}
              quotaLimit={quota.limit}
              onDelete={removeFlight}
            />
          ))}
        </div>
      )}
    </Collapsible>
  )
}
