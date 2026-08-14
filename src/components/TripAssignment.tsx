import { useSavedTrips } from '../lib/trips'
import { closeAll } from '../lib/swipeCoordinator'

interface Props {
  tripId?: string
  onChange: (tripId: string | undefined) => void
}

/** Trip picker shown in a row's swipe-right panel. Choosing a trip (or
 * Unassigned) applies immediately and closes the swipe. */
export function TripAssignment({ tripId, onChange }: Props) {
  const [trips] = useSavedTrips()

  function pick(next: string | undefined) {
    onChange(next)
    closeAll()
  }

  return (
    <div className="h-full overflow-y-auto bg-[var(--color-pine)] text-white text-xs flex flex-col">
      <p className="px-2 pt-1.5 pb-1 font-medium opacity-80">Trip</p>
      <button
        type="button"
        onClick={() => pick(undefined)}
        className={'text-left px-2 py-1.5 ' + (!tripId ? 'bg-black/20 font-semibold' : '')}
      >
        Unassigned
      </button>
      {trips.map((trip) => (
        <button
          key={trip.id}
          type="button"
          onClick={() => pick(trip.id)}
          className={'text-left px-2 py-1.5 truncate ' + (tripId === trip.id ? 'bg-black/20 font-semibold' : '')}
        >
          {trip.name}
        </button>
      ))}
    </div>
  )
}
