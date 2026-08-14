import { useSavedTrips } from '../lib/trips'
import { closeAll } from '../lib/swipeCoordinator'

interface Props {
  tripId?: string
  onChange: (tripId: string | undefined) => void
}

/** Trip picker shown in a row's swipe-right panel. A native select so the
 * full trip list can open above the short row instead of being clipped. */
export function TripAssignment({ tripId, onChange }: Props) {
  const [trips] = useSavedTrips()

  return (
    <div className="h-full flex items-center px-2 bg-[var(--color-pine)]">
      <label className="w-full min-w-0">
        <span className="block text-[10px] text-white/80 mb-0.5">Trip</span>
        <select
          value={tripId ?? ''}
          onChange={(event) => {
            onChange(event.target.value || undefined)
            closeAll()
          }}
          onPointerDown={(event) => event.stopPropagation()}
          aria-label="Assign record to trip"
          className="w-full min-w-0 rounded border-0 bg-[var(--color-surface)] text-[var(--color-ink)] px-1.5 py-1 text-xs"
        >
          <option value="">Unassigned</option>
          {trips.map((trip) => (
            <option key={trip.id} value={trip.id}>
              {trip.name}
            </option>
          ))}
        </select>
      </label>
    </div>
  )
}
