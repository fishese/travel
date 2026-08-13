import { useState } from 'react'
import { useActiveTrip, useSavedTrips, newTrip, tripDateLabel } from '../lib/trips'
import { writeSettingExternally } from '../lib/useSetting'

function assignUnassigned(key: string, tripId: string) {
  try {
    const raw = localStorage.getItem(key)
    const records = raw ? (JSON.parse(raw) as Array<{ tripId?: string }>) : []
    writeSettingExternally(key, records.map((record) => (record.tripId ? record : { ...record, tripId })))
  } catch {
    // A malformed list is left alone; the owning section will surface it.
  }
}

function unassignTrip(key: string, tripId: string) {
  try {
    const raw = localStorage.getItem(key)
    const records = raw ? (JSON.parse(raw) as Array<{ tripId?: string }>) : []
    writeSettingExternally(key, records.map((record) => (record.tripId === tripId ? { ...record, tripId: undefined } : record)))
  } catch {
    // Leave malformed data untouched.
  }
}

export function TripManager() {
  const [trips, setTrips] = useSavedTrips()
  const { activeTripId, activeTrip, selectTrip } = useActiveTrip()
  const [adding, setAdding] = useState(false)
  const [name, setName] = useState('')
  const [destination, setDestination] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  function add() {
    if (!name.trim()) return
    const trip = newTrip({ name, destination, startDate, endDate })
    setTrips((prev) => [...prev, trip])
    selectTrip(trip.id)
    setName('')
    setDestination('')
    setStartDate('')
    setEndDate('')
    setAdding(false)
  }

  function deleteActive() {
    if (!activeTrip || !window.confirm(`Delete trip “${activeTrip.name}”? Its records will become unassigned.`)) return
    for (const key of ['travel_flights', 'travel_hotels', 'travel_bookings', 'travel_dive_certs']) unassignTrip(key, activeTrip.id)
    setTrips((prev) => prev.filter((trip) => trip.id !== activeTrip.id))
    selectTrip('')
  }

  return (
    <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3 mt-2">
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold">Active trip</h2>
          <p className="text-xs text-[var(--color-muted)] truncate">{activeTrip ? `${activeTrip.name}${tripDateLabel(activeTrip) ? ` · ${tripDateLabel(activeTrip)}` : ''}` : 'Unassigned records'}</p>
        </div>
        <button type="button" onClick={() => setAdding((open) => !open)} className="text-xs text-[var(--color-pine)] underline">{adding ? 'Cancel' : '+ New trip'}</button>
      </div>

      <select value={activeTripId} onChange={(e) => selectTrip(e.target.value)} aria-label="Active trip" className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm">
        <option value="">Unassigned records</option>
        {trips.map((trip) => <option key={trip.id} value={trip.id}>{trip.name}{trip.destination ? ` · ${trip.destination}` : ''}</option>)}
      </select>

      {adding && (
        <div className="mt-2 space-y-2">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Trip name (e.g. Japan 2026)" aria-label="Trip name" className="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm" />
          <input value={destination} onChange={(e) => setDestination(e.target.value)} placeholder="Destination (optional)" aria-label="Trip destination" className="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm" />
          <div className="flex gap-2">
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} aria-label="Trip start date" className="flex-1 min-w-0 rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm" />
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} aria-label="Trip end date" className="flex-1 min-w-0 rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm" />
          </div>
          <button type="button" onClick={add} disabled={!name.trim()} className="w-full rounded-lg bg-[var(--color-pine)] text-white px-3 py-2 text-sm disabled:opacity-50">Create trip</button>
        </div>
      )}

      {activeTrip && (
        <div className="flex flex-wrap gap-3 mt-2 text-xs">
          <button type="button" onClick={() => { for (const key of ['travel_flights', 'travel_hotels', 'travel_bookings', 'travel_dive_certs']) assignUnassigned(key, activeTrip.id) }} className="text-[var(--color-pine)] underline">Assign all currently unassigned records here</button>
          <button type="button" onClick={deleteActive} className="text-[var(--color-danger)] underline">Delete trip</button>
        </div>
      )}
    </section>
  )
}
