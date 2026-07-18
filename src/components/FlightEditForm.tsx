import { useState } from 'react'
import type { FlightFieldInput } from '../lib/flights'

interface Props {
  initial: FlightFieldInput
  onSave: (fields: FlightFieldInput) => void
  onCancel: () => void
}

export function FlightEditForm({ initial, onSave, onCancel }: Props) {
  const [flightIata, setFlightIata] = useState(initial.flightIata)
  const [date, setDate] = useState(initial.date)
  const [origin, setOrigin] = useState(initial.origin ?? '')
  const [destination, setDestination] = useState(initial.destination ?? '')
  const [departureTime, setDepartureTime] = useState(initial.departureTime ?? '')
  const [arrivalTime, setArrivalTime] = useState(initial.arrivalTime ?? '')
  const [notes, setNotes] = useState(initial.notes ?? '')

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <input
          value={flightIata}
          onChange={(e) => setFlightIata(e.target.value)}
          placeholder="Flight # (e.g. CX500)"
          className="flex-1 min-w-0 rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm"
        />
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="flex-1 min-w-0 rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm"
        />
      </div>
      <div className="flex flex-wrap gap-2">
        <input
          value={origin}
          onChange={(e) => setOrigin(e.target.value)}
          placeholder="From (e.g. HKG, optional)"
          className="flex-1 min-w-0 rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm"
        />
        <input
          type="time"
          value={departureTime}
          onChange={(e) => setDepartureTime(e.target.value)}
          aria-label="Departure time, local to origin"
          className="flex-1 min-w-0 rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm"
        />
      </div>
      <div className="flex flex-wrap gap-2">
        <input
          value={destination}
          onChange={(e) => setDestination(e.target.value)}
          placeholder="To (e.g. NRT, optional)"
          className="flex-1 min-w-0 rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm"
        />
        <input
          type="time"
          value={arrivalTime}
          onChange={(e) => setArrivalTime(e.target.value)}
          aria-label="Arrival time, local to destination"
          className="flex-1 min-w-0 rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm"
        />
      </div>
      <input
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Notes (optional)"
        className="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm"
      />
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => onSave({ flightIata, date, origin, destination, departureTime, arrivalTime, notes })}
          disabled={!flightIata.trim()}
          className="flex-1 rounded-lg bg-[var(--color-pine)] text-white px-3 py-2 text-sm disabled:opacity-50"
        >
          Save
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
