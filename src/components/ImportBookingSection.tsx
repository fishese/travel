import { useState } from 'react'
import { Collapsible } from './Collapsible'
import { newFlight, useSavedFlights } from '../lib/flights'
import { newHotel, useSavedHotels } from '../lib/hotels'
import { CATEGORY_LABELS, newBooking, useSavedBookings, type BookingCategory } from '../lib/bookings'
import { saveFile } from '../lib/fileVault'
import { tripIdForNewRecord, useActiveTrip } from '../lib/trips'
import { parseImportInput } from '../lib/bookingImport/jsonFormat'
import { extractPdfText } from '../lib/bookingImport/pdfText'
import { redactSensitive } from '../lib/bookingImport/sensitive'
import { bookingReady, defaultDocumentStorage, flightReady, hotelReady, importFileCategory, type DocumentStorage } from '../lib/bookingImport/storage'
import type { DraftBooking, DraftFlight, DraftHotel, ParsedImport } from '../lib/bookingImport/types'

interface Props {
  onMoveUp?: () => void
  onMoveDown?: () => void
}

interface FlightRow extends DraftFlight { include: boolean }
interface HotelRow extends DraftHotel { include: boolean }
interface BookingRow extends DraftBooking { include: boolean }

const fieldClass = 'w-full rounded-lg border border-[var(--color-border)] px-2 py-1.5 text-sm'

function clean(value: string, stripped: { current: boolean }): string {
  const next = redactSensitive(value).text
  if (next !== value) stripped.current = true
  return next
}

export function ImportBookingSection({ onMoveUp, onMoveDown }: Props) {
  const [, setFlights] = useSavedFlights()
  const [, setHotels] = useSavedHotels()
  const [, setBookings] = useSavedBookings()
  const { activeTripId } = useActiveTrip()

  const [text, setText] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [fileKey, setFileKey] = useState(0)
  const [preview, setPreview] = useState<ParsedImport | null>(null)
  const [flights, setFlightRows] = useState<FlightRow[]>([])
  const [hotels, setHotelRows] = useState<HotelRow[]>([])
  const [bookings, setBookingRows] = useState<BookingRow[]>([])
  const [storage, setStorage] = useState<DocumentStorage>('public')
  const [acknowledgePublic, setAcknowledgePublic] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const includedFlights = flights.filter((row) => row.include)
  const includedHotels = hotels.filter((row) => row.include)
  const includedBookings = bookings.filter((row) => row.include)
  const includedCount = includedFlights.length + includedHotels.length + includedBookings.length
  const invalid = includedFlights.some((row) => !flightReady(row)) || includedHotels.some((row) => !hotelReady(row)) || includedBookings.some((row) => !bookingReady(row))
  const needsPublicAck = Boolean(file && preview?.suggestVault && storage === 'public' && !acknowledgePublic)

  async function buildPreview() {
    setError('')
    setSuccess('')
    setBusy(true)
    try {
      let source = text
      if (file) {
        const pdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
        if (pdf) {
          const worker = (await import('pdfjs-dist/legacy/build/pdf.worker.min.mjs?url')).default as string
          source = await extractPdfText(new Uint8Array(await file.arrayBuffer()), worker)
        } else {
          source = await file.text()
        }
      }
      if (!source.trim()) {
        setError('Paste a confirmation or choose a PDF, text, or JSON file.')
        setPreview(null)
        return
      }
      const result = parseImportInput(source)
      if (!result.ok) {
        setError(result.error)
        setPreview(null)
        return
      }
      setPreview(result.preview)
      setFlightRows(result.preview.flights.map((row) => ({ ...row, include: flightReady(row) })))
      setHotelRows(result.preview.hotels.map((row) => ({ ...row, include: hotelReady(row) })))
      setBookingRows(result.preview.bookings.map((row) => ({ ...row, include: bookingReady(row) })))
      setStorage(defaultDocumentStorage(result.preview))
      setAcknowledgePublic(false)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not read that file.')
      setPreview(null)
    } finally {
      setBusy(false)
    }
  }

  function buildRecords() {
    if (!preview || invalid || includedCount === 0 || needsPublicAck) return
    const stripped = { current: false }
    const rawText = clean(preview.rawText, stripped)
    const tripId = tripIdForNewRecord(activeTripId)
    const source = file ? 'uploaded' as const : 'pasted' as const
    const ids: string[] = []

    const flightRecords = includedFlights.map((row) => {
      const record = newFlight({
        tripId,
        flightIata: row.flightIata,
        date: row.date,
        origin: row.origin,
        destination: row.destination,
        departureTime: row.departureTime,
        arrivalTime: row.arrivalTime,
        arrivalDate: row.arrivalDate,
        notes: clean(row.notes, stripped),
        source,
        rawText,
      })
      ids.push(record.id)
      return record
    })
    const hotelRecords = includedHotels.map((row) => {
      const record = newHotel({
        tripId,
        name: clean(row.name, stripped),
        city: clean(row.city, stripped),
        address: clean(row.address, stripped),
        phone: clean(row.phone, stripped),
        checkIn: row.checkIn,
        checkOut: row.checkOut,
        notes: clean(row.notes, stripped),
        source,
        rawText,
      })
      ids.push(record.id)
      return record
    })
    const bookingRecords = includedBookings.map((row) => {
      const record = newBooking({
        tripId,
        date: row.date,
        time: row.time,
        category: row.category,
        label: clean(row.label, stripped),
        notes: clean(row.notes, stripped),
        source,
        rawText,
      })
      ids.push(record.id)
      return record
    })

    const parts = [
      flightRecords.length ? `${flightRecords.length} flight${flightRecords.length === 1 ? '' : 's'}` : '',
      hotelRecords.length ? `${hotelRecords.length} hotel${hotelRecords.length === 1 ? '' : 's'}` : '',
      bookingRecords.length ? `${bookingRecords.length} booking${bookingRecords.length === 1 ? '' : 's'}` : '',
    ].filter(Boolean)
    return { ids, parts, stripped: stripped.current, flightRecords, hotelRecords, bookingRecords }
  }

  async function save() {
    if (!preview || invalid || includedCount === 0 || needsPublicAck) return
    setBusy(true)
    setError('')
    try {
      const saved = buildRecords()
      if (!saved) return
      let fileNote = ''
      if (file && saved.ids.length) {
        const category = importFileCategory(preview, storage)
        await saveFile(file, file.name, category, saved.ids[0], tripIdForNewRecord(activeTripId), saved.ids)
        fileNote = storage === 'vault'
          ? ' The original file is in the protected vault.'
          : ' The original file is with your bookings and opens without the vault password.'
      }
      if (saved.flightRecords.length) setFlights((prev) => [...prev, ...saved.flightRecords])
      if (saved.hotelRecords.length) setHotels((prev) => [...prev, ...saved.hotelRecords])
      if (saved.bookingRecords.length) setBookings((prev) => [...prev, ...saved.bookingRecords])
      const strippedNote = saved.stripped ? ' A passport or card number was removed from the saved text.' : ''
      setSuccess(`Saved ${saved.parts.join(' and ')}.${fileNote}${strippedNote}`)
      setPreview(null)
      setFlightRows([])
      setHotelRows([])
      setBookingRows([])
      setText('')
      setFile(null)
      setFileKey((key) => key + 1)
      setAcknowledgePublic(false)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not save the file.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Collapsible id="import-booking" title="Import booking" onMoveUp={onMoveUp} onMoveDown={onMoveDown} defaultOpen>
      <p className="text-xs text-[var(--color-muted)] mb-2">
        Paste a confirmation or choose a PDF, text, or JSON file. Nothing is saved until you review the preview.
        The original day-by-day HTML plan is unchanged.
      </p>
      <textarea
        value={text}
        onChange={(event) => setText(event.target.value)}
        placeholder="Paste a flight, hotel, train, or car confirmation…"
        rows={5}
        className="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm"
      />
      <label className="block text-xs text-[var(--color-muted)]">
        Or choose a file
        <input
          key={fileKey}
          type="file"
          accept="application/pdf,application/json,text/plain,.pdf,.json,.txt"
          onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          className="mt-1 block w-full text-sm"
        />
      </label>
      {file && (
        <p className="text-xs text-[var(--color-muted)]">
          Using {file.name}.{' '}
          <button type="button" onClick={() => { setFile(null); setFileKey((key) => key + 1) }} className="text-[var(--color-pine)] underline">
            Use pasted text instead
          </button>
        </p>
      )}
      <button
        type="button"
        onClick={() => void buildPreview()}
        disabled={busy || (!text.trim() && !file)}
        className="w-full rounded-lg bg-[var(--color-pine)] text-white px-3 py-2 text-sm disabled:opacity-50"
      >
        {busy ? 'Reading…' : 'Preview import'}
      </button>
      {error && <p className="text-xs text-[var(--color-amber)]">{error}</p>}
      {success && <p className="text-xs text-[var(--color-pine)]">{success}</p>}

      {preview && (
        <div className="space-y-2 mt-2">
          {preview.warnings.map((warning) => (
            <p key={warning} className="text-xs text-[var(--color-amber)]">{warning}</p>
          ))}
          {preview.suggestVault && (
            <p className="text-xs text-[var(--color-amber)]">
              This looked like a passport or payment details. Those numbers were removed from the booking text.
              {file ? ' The original file still has them, so it defaults to the vault.' : ''}
            </p>
          )}

          {flights.map((row, index) => (
            <article key={`flight-${index}`} className="rounded-lg border border-[var(--color-border)] p-2 space-y-1">
              <label className="flex items-center gap-2 text-xs font-semibold">
                <input type="checkbox" checked={row.include} onChange={(event) => setFlightRows((rows) => rows.map((item, i) => i === index ? { ...item, include: event.target.checked } : item))} />
                Flight
              </label>
              <div className="flex gap-2">
                <input aria-label="Flight number" value={row.flightIata} onChange={(event) => setFlightRows((rows) => rows.map((item, i) => i === index ? { ...item, flightIata: event.target.value } : item))} className={fieldClass} />
                <input aria-label="Departure date" type="date" value={row.date} onChange={(event) => setFlightRows((rows) => rows.map((item, i) => i === index ? { ...item, date: event.target.value } : item))} className={fieldClass} />
              </div>
              <div className="flex gap-2">
                <input aria-label="Origin" value={row.origin} onChange={(event) => setFlightRows((rows) => rows.map((item, i) => i === index ? { ...item, origin: event.target.value } : item))} placeholder="From" className={fieldClass} />
                <input aria-label="Destination" value={row.destination} onChange={(event) => setFlightRows((rows) => rows.map((item, i) => i === index ? { ...item, destination: event.target.value } : item))} placeholder="To" className={fieldClass} />
              </div>
              <div className="flex gap-2">
                <input aria-label="Departure time" type="time" value={row.departureTime} onChange={(event) => setFlightRows((rows) => rows.map((item, i) => i === index ? { ...item, departureTime: event.target.value } : item))} className={fieldClass} />
                <input aria-label="Arrival time" type="time" value={row.arrivalTime} onChange={(event) => setFlightRows((rows) => rows.map((item, i) => i === index ? { ...item, arrivalTime: event.target.value } : item))} className={fieldClass} />
                <input aria-label="Arrival date" type="date" value={row.arrivalDate} onChange={(event) => setFlightRows((rows) => rows.map((item, i) => i === index ? { ...item, arrivalDate: event.target.value } : item))} className={fieldClass} />
              </div>
              <textarea aria-label="Flight notes" value={row.notes} onChange={(event) => setFlightRows((rows) => rows.map((item, i) => i === index ? { ...item, notes: event.target.value } : item))} rows={2} className={fieldClass} />
              {row.warnings.map((warning) => <p key={warning} className="text-xs text-[var(--color-amber)]">{warning}</p>)}
              {row.include && !flightReady(row) && <p className="text-xs text-[var(--color-amber)]">Add a flight number and date, or uncheck this row.</p>}
            </article>
          ))}

          {hotels.map((row, index) => (
            <article key={`hotel-${index}`} className="rounded-lg border border-[var(--color-border)] p-2 space-y-1">
              <label className="flex items-center gap-2 text-xs font-semibold">
                <input type="checkbox" checked={row.include} onChange={(event) => setHotelRows((rows) => rows.map((item, i) => i === index ? { ...item, include: event.target.checked } : item))} />
                Hotel
              </label>
              <input aria-label="Hotel name" value={row.name} onChange={(event) => setHotelRows((rows) => rows.map((item, i) => i === index ? { ...item, name: event.target.value } : item))} className={fieldClass} />
              <input aria-label="City" value={row.city} onChange={(event) => setHotelRows((rows) => rows.map((item, i) => i === index ? { ...item, city: event.target.value } : item))} placeholder="City" className={fieldClass} />
              <input aria-label="Address" value={row.address} onChange={(event) => setHotelRows((rows) => rows.map((item, i) => i === index ? { ...item, address: event.target.value } : item))} placeholder="Address" className={fieldClass} />
              <input aria-label="Phone" value={row.phone} onChange={(event) => setHotelRows((rows) => rows.map((item, i) => i === index ? { ...item, phone: event.target.value } : item))} placeholder="Phone" className={fieldClass} />
              <div className="flex gap-2">
                <input aria-label="Check-in" type="date" value={row.checkIn} onChange={(event) => setHotelRows((rows) => rows.map((item, i) => i === index ? { ...item, checkIn: event.target.value } : item))} className={fieldClass} />
                <input aria-label="Check-out" type="date" value={row.checkOut} onChange={(event) => setHotelRows((rows) => rows.map((item, i) => i === index ? { ...item, checkOut: event.target.value } : item))} className={fieldClass} />
              </div>
              <textarea aria-label="Hotel notes" value={row.notes} onChange={(event) => setHotelRows((rows) => rows.map((item, i) => i === index ? { ...item, notes: event.target.value } : item))} rows={2} className={fieldClass} />
              {row.warnings.map((warning) => <p key={warning} className="text-xs text-[var(--color-amber)]">{warning}</p>)}
              {row.include && !hotelReady(row) && <p className="text-xs text-[var(--color-amber)]">Add a hotel name, or uncheck this row.</p>}
            </article>
          ))}

          {bookings.map((row, index) => (
            <article key={`booking-${index}`} className="rounded-lg border border-[var(--color-border)] p-2 space-y-1">
              <label className="flex items-center gap-2 text-xs font-semibold">
                <input type="checkbox" checked={row.include} onChange={(event) => setBookingRows((rows) => rows.map((item, i) => i === index ? { ...item, include: event.target.checked } : item))} />
                Booking
              </label>
              <select aria-label="Booking category" value={row.category} onChange={(event) => setBookingRows((rows) => rows.map((item, i) => i === index ? { ...item, category: event.target.value as BookingCategory } : item))} className={fieldClass}>
                {(Object.keys(CATEGORY_LABELS) as BookingCategory[]).map((category) => (
                  <option key={category} value={category}>{CATEGORY_LABELS[category]}</option>
                ))}
              </select>
              <input aria-label="Booking label" value={row.label} onChange={(event) => setBookingRows((rows) => rows.map((item, i) => i === index ? { ...item, label: event.target.value } : item))} className={fieldClass} />
              <div className="flex gap-2">
                <input aria-label="Booking date" type="date" value={row.date} onChange={(event) => setBookingRows((rows) => rows.map((item, i) => i === index ? { ...item, date: event.target.value } : item))} className={fieldClass} />
                <input aria-label="Booking time" type="time" value={row.time} onChange={(event) => setBookingRows((rows) => rows.map((item, i) => i === index ? { ...item, time: event.target.value } : item))} className={fieldClass} />
              </div>
              <textarea aria-label="Booking notes" value={row.notes} onChange={(event) => setBookingRows((rows) => rows.map((item, i) => i === index ? { ...item, notes: event.target.value } : item))} rows={2} className={fieldClass} />
              {row.warnings.map((warning) => <p key={warning} className="text-xs text-[var(--color-amber)]">{warning}</p>)}
              {row.include && !bookingReady(row) && <p className="text-xs text-[var(--color-amber)]">Add a label and date, or uncheck this row.</p>}
            </article>
          ))}

          {file && (
            <fieldset className="space-y-1">
              <legend className="text-xs font-semibold">Where should the file go?</legend>
              <label className="flex items-start gap-2 text-xs">
                <input type="radio" name="import-storage" checked={storage === 'public'} onChange={() => setStorage('public')} />
                <span>Keep the file with your bookings (no vault password)</span>
              </label>
              <label className="flex items-start gap-2 text-xs">
                <input type="radio" name="import-storage" checked={storage === 'vault'} onChange={() => setStorage('vault')} />
                <span>Protected vault (passport, payment details, and other private files)</span>
              </label>
              {preview.suggestVault && storage === 'public' && (
                <label className="flex items-start gap-2 text-xs text-[var(--color-amber)]">
                  <input type="checkbox" checked={acknowledgePublic} onChange={(event) => setAcknowledgePublic(event.target.checked)} />
                  <span>The original file still contains the passport or card details. Store it with public bookings anyway.</span>
                </label>
              )}
            </fieldset>
          )}

          <button
            type="button"
            onClick={() => void save()}
            disabled={busy || includedCount === 0 || invalid || needsPublicAck}
            className="w-full rounded-lg bg-[var(--color-pine)] text-white px-3 py-2 text-sm disabled:opacity-50"
          >
            Save selected
          </button>
        </div>
      )}
    </Collapsible>
  )
}
