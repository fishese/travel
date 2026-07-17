import { useState, type ReactNode } from 'react'

interface Props {
  count: number
  children: ReactNode
}

/**
 * Past flights/hotels/bookings stay in storage (nothing is deleted) but
 * are tucked behind a "Show past" toggle by default, so a list doesn't
 * just grow forever across trips. Collapsed on every mount deliberately
 * — this isn't meant to be a persisted preference, just a way to get old
 * entries out of the way of the current trip.
 */
export function PastEntries({ count, children }: Props) {
  const [open, setOpen] = useState(false)
  if (count === 0) return null
  return (
    <div className="mt-2 pt-2 border-t border-dashed border-[var(--color-border)]">
      <button type="button" onClick={() => setOpen((o) => !o)} className="text-xs text-[var(--color-muted)] underline">
        {open ? 'Hide past' : `Show past (${count})`}
      </button>
      {open && <div className="space-y-2 mt-2">{children}</div>}
    </div>
  )
}
