import { useState } from 'react'
import { useSavedFlights, useAviationstackKey, useFlightApiQuota, newFlight } from '../lib/flights'
import { localDateStr } from '../lib/dateUtils'
import { FlightCard } from './FlightCard'
import { Collapsible } from './Collapsible'

export function FlightsSection() {
  const [flights, setFlights] = useSavedFlights()
  const [apiKey, setApiKey] = useAviationstackKey()
  const quota = useFlightApiQuota()

  const [keyInput, setKeyInput] = useState(apiKey)
  const [showKeyInput, setShowKeyInput] = useState(!apiKey)

  const [flightIataInput, setFlightIataInput] = useState('')
  const [dateInput, setDateInput] = useState(() => localDateStr())
  const [notesInput, setNotesInput] = useState('')

  function addFlight() {
    if (!flightIataInput.trim()) return
    setFlights((prev) => [...prev, newFlight(flightIataInput, dateInput, notesInput)])
    setFlightIataInput('')
    setNotesInput('')
  }

  function removeFlight(id: string) {
    setFlights((prev) => prev.filter((f) => f.id !== id))
  }

  const sorted = [...flights].sort((a, b) => a.date.localeCompare(b.date))

  return (
    <Collapsible title="Flights">
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
          <div className="flex gap-2">
            <input
              value={keyInput}
              onChange={(e) => setKeyInput(e.target.value)}
              placeholder="API key"
              className="flex-1 rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm"
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
      )}

      <div className="space-y-2 mb-2 pb-2 border-b border-dashed border-[var(--color-border)]">
        <div className="flex gap-2">
          <input
            value={flightIataInput}
            onChange={(e) => setFlightIataInput(e.target.value)}
            placeholder="Flight # (e.g. CX500)"
            className="flex-1 rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm"
          />
          <input
            type="date"
            value={dateInput}
            onChange={(e) => setDateInput(e.target.value)}
            className="rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm"
          />
        </div>
        <input
          value={notesInput}
          onChange={(e) => setNotesInput(e.target.value)}
          placeholder="Notes (optional) — e.g. HKG→NRT"
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
            <FlightCard key={f.id} flight={f} apiKey={apiKey} recordCall={quota.recordCall} onDelete={removeFlight} />
          ))}
        </div>
      )}
    </Collapsible>
  )
}
