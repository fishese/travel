import { useState } from 'react'
import {
  useSavedBookings,
  newBooking,
  CATEGORY_EMOJI,
  CATEGORY_LABELS,
  type BookingCategory,
} from '../lib/bookings'
import { localDateStr } from '../lib/dateUtils'
import { Collapsible } from './Collapsible'

const CATEGORIES = Object.keys(CATEGORY_EMOJI) as BookingCategory[]

export function BookingsSection() {
  const [bookings, setBookings] = useSavedBookings()

  const [category, setCategory] = useState<BookingCategory>('other')
  const [date, setDate] = useState(() => localDateStr())
  const [time, setTime] = useState('')
  const [label, setLabel] = useState('')
  const [notes, setNotes] = useState('')

  function addBooking() {
    if (!label.trim()) return
    setBookings((prev) => [...prev, newBooking({ date, time, category, label, notes })])
    setLabel('')
    setNotes('')
    setTime('')
  }

  function removeBooking(id: string) {
    setBookings((prev) => prev.filter((b) => b.id !== id))
  }

  const sorted = [...bookings].sort((a, b) => a.date.localeCompare(b.date) || (a.time ?? '').localeCompare(b.time ?? ''))

  return (
    <Collapsible title="Bookings">
      <p className="text-xs text-[var(--color-muted)] mb-2">
        Anything with a date that isn't a flight or hotel — shows, tours, restaurants, trains. Shows up in the
        Today/Tomorrow reminders above.
      </p>

      <div className="space-y-2 mb-2 pb-2 border-b border-dashed border-[var(--color-border)]">
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCategory(c)}
              aria-pressed={category === c}
              className={
                'rounded-full px-3 py-1 text-xs border ' +
                (category === c
                  ? 'bg-[var(--color-pine)] text-white border-[var(--color-pine)]'
                  : 'border-[var(--color-border)] text-[var(--color-muted)] bg-[var(--color-surface)]')
              }
            >
              {CATEGORY_EMOJI[c]} {CATEGORY_LABELS[c]}
            </button>
          ))}
        </div>

        <div className="flex gap-2">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm"
          />
          <input
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            placeholder="optional"
            className="rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm"
          />
        </div>

        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder='e.g. "Hadestown 18:45 showing"'
          className="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm"
        />
        <input
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Notes (optional) — confirmation #, address, etc."
          className="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm"
        />
        <button
          type="button"
          onClick={addBooking}
          disabled={!label.trim()}
          className="w-full rounded-lg bg-[var(--color-pine)] text-white px-3 py-2 text-sm disabled:opacity-50"
        >
          Add booking
        </button>
      </div>

      {sorted.length === 0 ? (
        <p className="text-sm text-[var(--color-muted)]">No bookings saved yet.</p>
      ) : (
        <div className="space-y-1">
          {sorted.map((b) => (
            <div key={b.id} className="flex items-start justify-between gap-2 text-sm py-1">
              <div className="min-w-0">
                <p className="truncate">
                  {CATEGORY_EMOJI[b.category]} {b.date}
                  {b.time && ` · ${b.time}`} · {b.label}
                </p>
                {b.notes && <p className="text-xs text-[var(--color-muted)] truncate">{b.notes}</p>}
              </div>
              <button
                type="button"
                onClick={() => removeBooking(b.id)}
                className="text-xs text-[var(--color-amber)] shrink-0"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      )}
    </Collapsible>
  )
}
