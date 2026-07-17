import { useState } from 'react'
import {
  useSavedBookings,
  newBooking,
  CATEGORY_EMOJI,
  CATEGORY_LABELS,
  type BookingCategory,
} from '../lib/bookings'
import { localDateStr } from '../lib/dateUtils'
import { isPastDate } from '../lib/archive'
import { parseBookingText } from '../lib/pasteParse'
import { Collapsible } from './Collapsible'
import { AddFormToggle } from './AddFormToggle'
import { PastEntries } from './PastEntries'
import { SwipeToDelete } from './SwipeToDelete'
import { requestOpen } from '../lib/swipeCoordinator'
import { PasteParseBox } from './PasteParseBox'
import { RawTextDisclosure } from './RawTextDisclosure'

const CATEGORIES = Object.keys(CATEGORY_EMOJI) as BookingCategory[]

interface Props {
  onMoveUp?: () => void
  onMoveDown?: () => void
}

export function BookingsSection({ onMoveUp, onMoveDown }: Props) {
  const [bookings, setBookings] = useSavedBookings()

  const [category, setCategory] = useState<BookingCategory>('other')
  const [date, setDate] = useState(() => localDateStr())
  const [time, setTime] = useState('')
  const [label, setLabel] = useState('')
  const [notes, setNotes] = useState('')
  const [showAddForm, setShowAddForm] = useState(() => bookings.length === 0)
  const [pastedText, setPastedText] = useState<string | undefined>(undefined)
  const [yearWasInferred, setYearWasInferred] = useState(false)

  function handleParse(text: string) {
    const parsed = parseBookingText(text)
    if (parsed.date) setDate(parsed.date)
    if (parsed.time) setTime(parsed.time)
    if (parsed.label) setLabel(parsed.label)
    setCategory(parsed.category)
    setPastedText(text)
    setYearWasInferred(parsed.yearInferred)
  }

  function addBooking() {
    if (!label.trim()) return
    setBookings((prev) => [
      ...prev,
      newBooking({
        date,
        time,
        category,
        label,
        notes,
        source: pastedText ? 'pasted' : 'manual',
        rawText: pastedText,
      }),
    ])
    setLabel('')
    setNotes('')
    setTime('')
    setPastedText(undefined)
    setYearWasInferred(false)
    setShowAddForm(false)
  }

  function removeBooking(id: string) {
    setBookings((prev) => prev.filter((b) => b.id !== id))
  }

  const sorted = [...bookings].sort((a, b) => a.date.localeCompare(b.date) || (a.time ?? '').localeCompare(b.time ?? ''))
  const upcoming = sorted.filter((b) => !isPastDate(b.date))
  const past = sorted.filter((b) => isPastDate(b.date))

  function renderBooking(b: (typeof bookings)[number]) {
    return (
      <SwipeToDelete key={b.id} id={b.id} label={b.label} onDelete={() => removeBooking(b.id)}>
        <div className="flex items-start justify-between gap-2 text-sm py-1 bg-[var(--color-surface)] px-1">
          <div className="min-w-0">
            <p className="truncate">
              {CATEGORY_EMOJI[b.category]} {b.date}
              {b.time && ` · ${b.time}`} · {b.label}
            </p>
            {b.notes && <p className="text-xs text-[var(--color-muted)] truncate">{b.notes}</p>}
            {b.rawText && <RawTextDisclosure text={b.rawText} />}
          </div>
          <button
            type="button"
            onClick={() => requestOpen(b.id)}
            className="text-xs text-[var(--color-amber)] shrink-0"
          >
            Remove
          </button>
        </div>
      </SwipeToDelete>
    )
  }

  return (
    <Collapsible id="bookings" title="Bookings" onMoveUp={onMoveUp} onMoveDown={onMoveDown}>
      <p className="text-xs text-[var(--color-muted)] mb-2">
        Anything with a date that isn't a flight or hotel — shows, tours, restaurants, trains. Shows up in the
        Today/Tomorrow reminders above.
      </p>

      <AddFormToggle label="Add booking" open={showAddForm} onOpenChange={setShowAddForm}>
        <PasteParseBox
          placeholder="Paste a reservation, ticket, or booking confirmation here…"
          onParse={handleParse}
        />
        {yearWasInferred && (
          <p className="text-xs text-[var(--color-amber)]">
            No year in the pasted text — assumed {date.slice(0, 4)}. Double-check the date below.
          </p>
        )}
        {category === 'flight' && (
          <p className="text-xs text-[var(--color-amber)]">
            This looks like a flight — the Flights section above gives you live status tracking too, if that's what
            this is.
          </p>
        )}

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

        <div className="flex flex-wrap gap-2">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="flex-1 min-w-0 rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm"
          />
          <input
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            placeholder="optional"
            className="flex-1 min-w-0 rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm"
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
      </AddFormToggle>

      {sorted.length === 0 ? (
        <p className="text-sm text-[var(--color-muted)]">No bookings saved yet.</p>
      ) : (
        <>
          {upcoming.length === 0 && <p className="text-sm text-[var(--color-muted)]">No upcoming bookings.</p>}
          <div className="space-y-1">{upcoming.map(renderBooking)}</div>
          <PastEntries count={past.length}>{past.map(renderBooking)}</PastEntries>
        </>
      )}
    </Collapsible>
  )
}
