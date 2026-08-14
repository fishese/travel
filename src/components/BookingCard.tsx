import { useState } from 'react'
import { applyBookingEdit, CATEGORY_EMOJI, type Booking } from '../lib/bookings'
import { SwipeToDelete } from './SwipeToDelete'
import { requestOpen } from '../lib/swipeCoordinator'
import { ExpandableCard } from './ExpandableCard'
import { BookingEditForm } from './BookingEditForm'
import { RawTextDisclosure } from './RawTextDisclosure'
import { LinkedFiles } from './LinkedFiles'
import { TripAssignment } from './TripAssignment'

interface Props {
  booking: Booking
  onDelete: (id: string) => void
  onUpdate: (updated: Booking) => void
  onTripChange?: (tripId: string | undefined) => void
}

export function BookingCard({ booking, onDelete, onUpdate, onTripChange }: Props) {
  const [editing, setEditing] = useState(false)

  const header = (
    <div className="min-w-0">
      <p className="text-sm truncate">
        {CATEGORY_EMOJI[booking.category]} {booking.date}
        {booking.time && ` · ${booking.time}`} · {booking.label}
      </p>
    </div>
  )

  return (
    <SwipeToDelete
      id={booking.id}
      label={booking.label}
      onDelete={() => onDelete(booking.id)}
      rightPanel={onTripChange ? <TripAssignment tripId={booking.tripId} onChange={onTripChange} /> : undefined}
    >
      <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <ExpandableCard header={header}>
              {editing ? (
                <BookingEditForm
                  initial={{
                    date: booking.date,
                    time: booking.time,
                    category: booking.category,
                    label: booking.label,
                    notes: booking.notes,
                  }}
                  onSave={(fields) => {
                    onUpdate(applyBookingEdit(booking, fields))
                    setEditing(false)
                  }}
                  onCancel={() => setEditing(false)}
                />
              ) : (
                <>
                  <p className="text-sm break-words">{booking.label}</p>
                  {booking.notes && (
                    <p className="text-xs text-[var(--color-muted)] mt-1 whitespace-pre-wrap break-words">
                      {booking.notes}
                    </p>
                  )}
                  {booking.rawText && <RawTextDisclosure text={booking.rawText} />}
                  <LinkedFiles category="booking" linkedId={booking.id} />
                  <button
                    type="button"
                    onClick={() => setEditing(true)}
                    className="text-xs text-[var(--color-pine)] underline mt-2"
                  >
                    Edit
                  </button>
                </>
              )}
            </ExpandableCard>
          </div>
          <button
            type="button"
            onClick={() => requestOpen(booking.id)}
            className="text-xs text-[var(--color-amber)] shrink-0"
          >
            Remove
          </button>
        </div>
      </div>
    </SwipeToDelete>
  )
}
