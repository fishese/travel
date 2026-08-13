import { useSavedTrips } from '../lib/trips'

interface Props {
  tripId?: string
  onChange: (tripId: string | undefined) => void
}

/** Small per-record control used wherever a flight, hotel, booking or cert is
 * rendered. Selecting a different trip immediately moves the record out of
 * the current filtered view; choosing Unassigned makes it visible there. */
export function TripAssignment({ tripId, onChange }: Props) {
  const [trips] = useSavedTrips()

  return (
    <label className="flex items-center gap-1 text-[11px] text-[var(--color-muted)] min-w-0">
      <span className="shrink-0">Trip</span>
      <select
        value={tripId ?? ''}
        onChange={(event) => onChange(event.target.value || undefined)}
        aria-label="Assign record to trip"
        className="min-w-0 max-w-full rounded border border-[var(--color-border)] bg-[var(--color-surface)] px-1.5 py-1 text-[11px]"
      >
        <option value="">Unassigned</option>
        {trips.map((trip) => (
          <option key={trip.id} value={trip.id}>
            {trip.name}
          </option>
        ))}
      </select>
    </label>
  )
}
