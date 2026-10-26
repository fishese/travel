import { useState } from 'react'
import {
  useSavedBookings,
  newBooking,
  CATEGORY_EMOJI,
  CATEGORY_LABELS,
  type Booking,
  type BookingCategory,
} from '../lib/bookings'
import { localDateStr } from '../lib/dateUtils'
import { isPastDate } from '../lib/archive'
import { parseBookingDocument } from '../lib/bookingImport/textParse'
import { Collapsible } from './Collapsible'
import { AddFormToggle } from './AddFormToggle'
import { PastEntries } from './PastEntries'
import { PasteParseBox } from './PasteParseBox'
import { BookingCard } from './BookingCard'
import { useActiveTrip, tripMatches, tripIdForNewRecord } from '../lib/trips'
import { TrainFields, type TrainDetails } from './TrainFields'
import { trainDateDefaults } from '../lib/bookingImport/dateDefaults'
import { bookingReady } from '../lib/bookingImport/storage'

const CATEGORIES = Object.keys(CATEGORY_EMOJI) as BookingCategory[]

interface Props {
  onMoveUp?: () => void
  onMoveDown?: () => void
}

export function BookingsSection({ onMoveUp, onMoveDown }: Props) {
  const [bookings, setBookings] = useSavedBookings()
  const { activeTripId } = useActiveTrip()
  const scopedBookings = bookings.filter((booking) => tripMatches(booking, activeTripId))

  const [category, setCategory] = useState<BookingCategory>('other')
  const [date, setDate] = useState(() => localDateStr())
  const [time, setTime] = useState('')
  const [label, setLabel] = useState('')
  const [notes, setNotes] = useState('')
  const [journey, setJourney] = useState<TrainDetails>({})
  const [showAddForm, setShowAddForm] = useState(() => bookings.length === 0)
  const [pastedText, setPastedText] = useState<string | undefined>(undefined)
  const [yearWasInferred, setYearWasInferred] = useState(false)
  const [parseNote, setParseNote] = useState('')

  function handleParse(text: string) {
    const parsed = parseBookingDocument(text)
    const booking = parsed.bookings[0]
    if (booking) {
      setDate(booking.date)
      setTime(booking.time)
      setLabel(booking.label)
      setNotes(booking.notes)
      setJourney(trainDateDefaults(booking))
      setCategory(booking.category)
      setYearWasInferred(booking.yearInferred)
      setParseNote(booking.warnings.join(' '))
    } else if (parsed.flights[0]) {
      const flight = parsed.flights[0]
      setDate(flight.date)
      setTime(flight.departureTime)
      setLabel(flight.flightIata)
      setNotes(flight.notes)
      setJourney({})
      setCategory('flight')
      setYearWasInferred(flight.yearInferred)
      setParseNote('')
    } else if (parsed.hotels[0]) {
      const hotel = parsed.hotels[0]
      setDate(hotel.checkIn)
      setLabel(hotel.name)
      setNotes(hotel.notes)
      setTime('')
      setJourney({})
      setCategory('other')
      setYearWasInferred(false)
      setParseNote('This looks like a hotel. Hotels keeps the address and check-out, and Import booking can save both.')
    } else {
      setParseNote(parsed.warnings[0] ?? 'Nothing was recognized in that text.')
    }
    setPastedText(parsed.rawText)
  }

  function addBooking() {
    if (!bookingReady({ ...journey, label, date, time })) return
    setBookings((prev) => [
      ...prev,
      newBooking({
        ...journey,
        tripId: tripIdForNewRecord(activeTripId),
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
    setJourney({})
    setPastedText(undefined)
    setYearWasInferred(false)
    setParseNote('')
    setShowAddForm(false)
  }

  function removeBooking(id: string) {
    setBookings((prev) => prev.filter((b) => b.id !== id))
  }

  function updateBooking(updated: Booking) {
    setBookings((prev) => prev.map((b) => (b.id === updated.id ? updated : b)))
  }

  const sorted = [...scopedBookings].sort((a, b) => a.date.localeCompare(b.date) || (a.time ?? '').localeCompare(b.time ?? ''))
  const upcoming = sorted.filter((b) => !isPastDate(b.date))
  const past = sorted.filter((b) => isPastDate(b.date))

  function renderBooking(b: Booking) {
    return (
      <BookingCard
        key={b.id}
        booking={b}
        onDelete={removeBooking}
        onUpdate={updateBooking}
        onTripChange={(tripId) => updateBooking({ ...b, tripId })}
      />
    )
  }

  return (
    <Collapsible id="bookings" title="Bookings" onMoveUp={onMoveUp} onMoveDown={onMoveDown}>
      <p className="text-xs text-[var(--color-muted)] mb-2">
        Anything with a date that isn't a flight or hotel — shows, tours, restaurants, trains, car rentals. Shows up in the
        Today/Tomorrow reminders above.
      </p>

      <AddFormToggle label="Add booking" open={showAddForm} onOpenChange={(open) => {
        setShowAddForm(open)
        if (open) setJourney((previous) => trainDateDefaults({ ...previous, category, date }))
      }}>
        <PasteParseBox
          placeholder="Paste a reservation, ticket, or booking confirmation here…"
          onParse={handleParse}
        />
        {yearWasInferred && (
          <p className="text-xs text-[var(--color-amber)]">
            No year in the pasted text — assumed {date.slice(0, 4)}. Double-check the date below.
          </p>
        )}
        {parseNote && <p className="text-xs text-[var(--color-amber)]">{parseNote}</p>}
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
              onClick={() => { setCategory(c); if (c === 'train') setJourney((previous) => trainDateDefaults({ ...previous, category: c, date })) }}
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
            aria-label="Booking date"
            onChange={(e) => { const next = e.target.value; setDate(next); setJourney((previous) => trainDateDefaults({ ...previous, category, date: next })) }}
            className="flex-1 min-w-0 rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm"
          />
          <input
            type="time"
            value={time}
            aria-label="Booking time, local"
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
        {category === 'train' && <TrainFields value={journey} onChange={setJourney} />}
        {!date && <p className="text-xs text-[var(--color-amber)]">Choose a booking date before saving.</p>}
        <button
          type="button"
          onClick={addBooking}
          disabled={!bookingReady({ ...journey, label, date, time })}
          className="w-full rounded-lg bg-[var(--color-pine)] text-white px-3 py-2 text-sm disabled:opacity-50"
        >
          Add booking
        </button>
      </AddFormToggle>

      {sorted.length === 0 ? (
        <p className="text-sm text-[var(--color-muted)]">{bookings.length ? 'No bookings match this trip filter. Change Active trip above to see other records.' : 'No bookings saved yet.'}</p>
      ) : (
        <>
          {upcoming.length === 0 && <p className="text-sm text-[var(--color-muted)]">No upcoming bookings.</p>}
          <div className="space-y-2">{upcoming.map(renderBooking)}</div>
          <PastEntries count={past.length}>{past.map(renderBooking)}</PastEntries>
        </>
      )}
    </Collapsible>
  )
}
