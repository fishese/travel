import { useState } from 'react'
import { useSavedFlights, useAviationstackKey, useFlightApiQuota, newFlight } from '../lib/flights'
import { localDateStr } from '../lib/dateUtils'
import { isPastDate } from '../lib/archive'
import { hapticTick, hapticConfirm } from '../lib/haptics'
import { parseFlightText } from '../lib/pasteParse'
import { FlightCard } from './FlightCard'
import { Collapsible } from './Collapsible'
import { AddFormToggle } from './AddFormToggle'
import { PastEntries } from './PastEntries'
import { PasteParseBox } from './PasteParseBox'

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
  const [showAddForm, setShowAddForm] = useState(() => flights.length === 0)
  const [pastedText, setPastedText] = useState<string | undefined>(undefined)
  const [yearWasInferred, setYearWasInferred] = useState(false)

  function handleParse(text: string) {
    const parsed = parseFlightText(text)
    if (parsed.flightIata) setFlightIataInput(parsed.flightIata)
    if (parsed.date) setDateInput(parsed.date)
    if (parsed.origin) setOriginInput(parsed.origin)
    if (parsed.destination) setDestinationInput(parsed.destination)
    if (parsed.departureTime) setDepartureTimeInput(parsed.departureTime)
    if (parsed.arrivalTime) setArrivalTimeInput(parsed.arrivalTime)
    setPastedText(text)
    setYearWasInferred(parsed.yearInferred)
  }

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
        source: pastedText ? 'pasted' : 'manual',
        rawText: pastedText,
      }),
    ])
    setFlightIataInput('')
    setOriginInput('')
    setDestinationInput('')
    setDepartureTimeInput('')
    setArrivalTimeInput('')
    setNotesInput('')
    setPastedText(undefined)
    setYearWasInferred(false)
    setShowAddForm(false)
  }

  function removeFlight(id: string) {
    setFlights((prev) => prev.filter((f) => f.id !== id))
  }

  const sorted = [...flights].sort((a, b) => a.date.localeCompare(b.date))
  const upcoming = sorted.filter((f) => !isPastDate(f.date))
  const past = sorted.filter((f) => isPastDate(f.date))

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
                    hapticTick()
                    setTimeout(() => setConfirmingReset(false), 3000)
                    return
                  }
                  hapticConfirm()
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

      <AddFormToggle label="Add flight" open={showAddForm} onOpenChange={setShowAddForm}>
        <PasteParseBox
          placeholder="Paste a boarding pass, e-ticket, or confirmation email here…"
          onParse={handleParse}
        />
        {yearWasInferred && (
          <p className="text-xs text-[var(--color-amber)]">
            No year in the pasted text — assumed {dateInput.slice(0, 4)}. Double-check the date below.
          </p>
        )}

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
      </AddFormToggle>

      {sorted.length === 0 ? (
        <p className="text-sm text-[var(--color-muted)]">No flights saved yet.</p>
      ) : (
        <>
          {upcoming.length === 0 && <p className="text-sm text-[var(--color-muted)]">No upcoming flights.</p>}
          <div className="space-y-2">
            {upcoming.map((f) => (
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
          <PastEntries count={past.length}>
            {past.map((f) => (
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
          </PastEntries>
        </>
      )}
    </Collapsible>
  )
}
