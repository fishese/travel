import { useState, type InputHTMLAttributes } from 'react'
import { Collapsible } from './Collapsible'
import { TrainFields } from './TrainFields'
import { newFlight, useSavedFlights } from '../lib/flights'
import { newHotel, useSavedHotels } from '../lib/hotels'
import { CATEGORY_LABELS, newBooking, useSavedBookings, type BookingCategory } from '../lib/bookings'
import { deleteFile, saveFile } from '../lib/fileVault'
import { useActiveTrip, useSavedTrips } from '../lib/trips'
import { parseImportInput } from '../lib/bookingImport/jsonFormat'
import { extractPdfText } from '../lib/bookingImport/pdfText'
import { redactSensitive } from '../lib/bookingImport/sensitive'
import { bookingReady, defaultDocumentStorage, flightReady, hotelReady, importFileCategory, type DocumentStorage } from '../lib/bookingImport/storage'
import { readImportFiles, MAX_IMPORT_FILES, type ImportDocument, type ImportIssue } from '../lib/bookingImport/batch'
import { bookingIdentity, duplicateFlags, flightIdentity, hotelIdentity } from '../lib/bookingImport/duplicates'
import { appendImportRecords } from '../lib/bookingImport/commit'
import { hotelDraftFromBooking } from '../lib/bookingImport/hotelDraft'
import { VaultLockedError } from '../lib/vaultCrypto'
import type { DraftBooking, DraftFlight, DraftHotel } from '../lib/bookingImport/types'

interface Props { onMoveUp?: () => void; onMoveDown?: () => void }
interface RowSource { include: boolean; document: number }
interface FlightRow extends DraftFlight, RowSource {}
interface HotelRow extends DraftHotel, RowSource {}
interface BookingRow extends DraftBooking, RowSource {}
interface ReviewedDocument extends ImportDocument { storage: DocumentStorage | 'none'; acknowledgePublic: boolean }

const fieldClass = 'w-full min-w-0 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1.5 text-sm'
const folderAttributes = { webkitdirectory: '', directory: '' } as InputHTMLAttributes<HTMLInputElement>
const UNASSIGNED = '__unassigned__'
const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? '' : 's'}`

export function ImportBookingSection({ onMoveUp, onMoveDown }: Props) {
  const [savedFlights] = useSavedFlights()
  const [savedHotels] = useSavedHotels()
  const [savedBookings] = useSavedBookings()
  const { activeTripId } = useActiveTrip()
  const [trips] = useSavedTrips()
  const [destinationTrip, setDestinationTrip] = useState<string | null>(null)
  const tripChoice = destinationTrip ?? (trips.some((trip) => trip.id === activeTripId) ? activeTripId : '')
  const tripChosen = tripChoice === UNASSIGNED || trips.some((trip) => trip.id === tripChoice)
  const [text, setText] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const [fileKey, setFileKey] = useState(0)
  const [documents, setDocuments] = useState<ReviewedDocument[]>([])
  const [issues, setIssues] = useState<ImportIssue[]>([])
  const [flights, setFlightRows] = useState<FlightRow[]>([])
  const [hotels, setHotelRows] = useState<HotelRow[]>([])
  const [bookings, setBookingRows] = useState<BookingRow[]>([])
  const [keepDuplicates, setKeepDuplicates] = useState(false)
  const [keepSourceText, setKeepSourceText] = useState(false)
  const [busy, setBusy] = useState(false)
  const [operation, setOperation] = useState<'read' | 'save'>('read')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const preview = documents.length > 0
  const selectedFlights = flights.filter((row) => row.include)
  const selectedHotels = hotels.filter((row) => row.include)
  const selectedBookings = bookings.filter((row) => row.include)
  const flightFlags = duplicateFlags<Parameters<typeof flightIdentity>[0]>(selectedFlights, savedFlights, flightIdentity)
  const hotelFlags = duplicateFlags<Parameters<typeof hotelIdentity>[0]>(selectedHotels, savedHotels, hotelIdentity)
  const bookingFlags = duplicateFlags<Parameters<typeof bookingIdentity>[0]>(selectedBookings, savedBookings, bookingIdentity)
  const duplicateFlights = new Set(selectedFlights.filter((_, index) => flightFlags[index]))
  const duplicateHotels = new Set(selectedHotels.filter((_, index) => hotelFlags[index]))
  const duplicateBookings = new Set(selectedBookings.filter((_, index) => bookingFlags[index]))
  const duplicateCount = duplicateFlights.size + duplicateHotels.size + duplicateBookings.size
  const includedFlights = selectedFlights.filter((row) => keepDuplicates || !duplicateFlights.has(row))
  const includedHotels = selectedHotels.filter((row) => keepDuplicates || !duplicateHotels.has(row))
  const includedBookings = selectedBookings.filter((row) => keepDuplicates || !duplicateBookings.has(row))
  const includedCount = includedFlights.length + includedHotels.length + includedBookings.length
  const invalidCount = includedFlights.filter((row) => !flightReady(row)).length + includedHotels.filter((row) => !hotelReady(row)).length + includedBookings.filter((row) => !bookingReady(row)).length
  const invalid = invalidCount > 0
  const selectedDocuments = new Set([...includedFlights, ...includedHotels, ...includedBookings].map((row) => row.document))
  const needsPublicAck = documents.some((doc, index) => selectedDocuments.has(index) && doc.file && doc.preview.suggestVault && doc.storage === 'public' && !doc.acknowledgePublic)

  function resetPreview() {
    setDocuments([])
    setFlightRows([])
    setHotelRows([])
    setBookingRows([])
    setIssues([])
    setError('')
    setSuccess('')
    setKeepDuplicates(false)
  }

  function chooseFiles(next: File[]) {
    resetPreview()
    if (next.length > MAX_IMPORT_FILES) {
      setFiles([])
      setFileKey((key) => key + 1)
      setError(`Choose at most ${MAX_IMPORT_FILES} files at a time.`)
      return
    }
    setFiles(next)
  }

  function changeBookingType(index: number, type: BookingCategory | 'hotel') {
    if (type === 'hotel') {
      const row = bookings[index]
      setHotelRows((rows) => [...rows, { ...hotelDraftFromBooking(row), document: row.document, include: row.include }])
      setBookingRows((rows) => rows.filter((_, i) => i !== index))
    } else {
      setBookingRows((rows) => rows.map((row, i) => i === index ? { ...row, category: type } : row))
    }
  }

  async function buildPreview() {
    resetPreview()
    setOperation('read')
    setBusy(true)
    try {
      let nextDocuments: ImportDocument[]
      if (files.length) {
        const result = await readImportFiles(files, async (bytes) => {
          const worker = (await import('pdfjs-dist/legacy/build/pdf.worker.min.mjs?url')).default as string
          return extractPdfText(bytes, worker)
        })
        nextDocuments = result.documents
        setIssues(result.issues)
      } else {
        const result = parseImportInput(text)
        if (!result.ok) throw new Error(result.error)
        if (!text.trim()) throw new Error('Paste a confirmation or choose files.')
        nextDocuments = [{ name: 'Pasted text', preview: result.preview }]
      }
      setDocuments(nextDocuments.map((doc) => ({ ...doc, storage: defaultDocumentStorage(doc.preview), acknowledgePublic: false })))
      setFlightRows(nextDocuments.flatMap((doc, document) => doc.preview.flights.map((row) => ({ ...row, document, include: true }))))
      setHotelRows(nextDocuments.flatMap((doc, document) => doc.preview.hotels.map((row) => ({ ...row, document, include: true }))))
      setBookingRows(nextDocuments.flatMap((doc, document) => doc.preview.bookings.map((row) => ({ ...row, document, include: true }))))
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not read these files.')
    } finally {
      setBusy(false)
    }
  }

  async function save() {
    if (!preview || invalid || !includedCount || needsPublicAck || !tripChosen || busy) return
    setOperation('save')
    setBusy(true)
    setError('')
    const uploaded: string[] = []
    try {
      const tripId = tripChoice === UNASSIGNED ? undefined : tripChoice
      const links = new Map<number, string[]>()
      const clean = (value: string | undefined) => value ? redactSensitive(value).text : undefined
      const provenance = (row: RowSource) => ({
        tripId,
        source: documents[row.document].file ? 'uploaded' as const : 'pasted' as const,
        rawText: keepSourceText ? documents[row.document].preview.rawText : undefined,
      })
      const link = (document: number, id: string) => links.set(document, [...(links.get(document) ?? []), id])
      const flightRecords = includedFlights.map((row) => {
        const record = newFlight({ ...row, ...provenance(row), notes: clean(row.notes) })
        link(row.document, record.id)
        return record
      })
      const hotelRecords = includedHotels.map((row) => {
        const record = newHotel({ ...row, ...provenance(row), name: clean(row.name) ?? '', city: clean(row.city) ?? '', address: clean(row.address), phone: clean(row.phone), notes: clean(row.notes) })
        link(row.document, record.id)
        return record
      })
      const bookingRecords = includedBookings.map((row) => {
        const record = newBooking({ ...row, ...provenance(row), label: clean(row.label) ?? '', notes: clean(row.notes), operator: clean(row.operator), serviceNumber: clean(row.serviceNumber), origin: clean(row.origin), destination: clean(row.destination), coach: clean(row.coach), seat: clean(row.seat) })
        link(row.document, record.id)
        return record
      })
      for (const [index, ids] of links) {
        const doc = documents[index]
        if (doc.file && doc.storage !== 'none') {
          const stored = await saveFile(doc.file, doc.file.name, importFileCategory(doc.preview, doc.storage), ids[0], tripId, ids)
          uploaded.push(stored.id)
        }
      }
      appendImportRecords({ flights: flightRecords, hotels: hotelRecords, bookings: bookingRecords }, tripId ?? '', keepDuplicates)
      const parts = [flightRecords.length && plural(flightRecords.length, 'flight'), hotelRecords.length && plural(hotelRecords.length, 'hotel'), bookingRecords.length && plural(bookingRecords.length, 'booking')].filter(Boolean)
      setSuccess(`Saved ${parts.join(', ')}. ${uploaded.length} original files attached.${!keepDuplicates && duplicateCount ? ` Skipped ${duplicateCount} duplicates.` : ''}`)
      setDocuments([])
      setFlightRows([])
      setHotelRows([])
      setBookingRows([])
      setText('')
      setFiles([])
      setFileKey((key) => key + 1)
    } catch (caught) {
      // Only remove files created by this attempt; never existing documents.
      await Promise.allSettled(uploaded.map((id) => deleteFile(id)))
      setError(caught instanceof VaultLockedError ? 'Unlock Protected Vault below, then try Save selected again. No booking records were saved.' : caught instanceof Error ? caught.message : 'Could not save the import.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Collapsible id="import-booking" title="Import booking" onMoveUp={onMoveUp} onMoveDown={onMoveDown} defaultOpen>
      <fieldset disabled={busy} className="space-y-2 min-w-0" onDragOver={(event) => event.preventDefault()} onDrop={(event) => {
        event.preventDefault()
        if (!busy) chooseFiles(Array.from(event.dataTransfer.files))
      }}>
        <p className="text-xs text-[var(--color-muted)]">Paste a confirmation, drop files here, or choose several PDFs, text or JSON files. Review everything before saving. Files are read on this device.</p>
        <label className="block text-xs font-semibold">Import into
          <select aria-label="Import into trip" value={tripChosen ? tripChoice : ''} onChange={(event) => setDestinationTrip(event.target.value)} className={fieldClass}>
            <option value="" disabled>Choose a trip</option>
            {trips.map((trip) => <option key={trip.id} value={trip.id}>{trip.name}</option>)}
            <option value={UNASSIGNED}>Unassigned records (explicitly)</option>
          </select>
        </label>
        {!tripChosen && <p className="text-xs text-[var(--color-amber)]">Choose a trip above, or create one using Active trip.</p>}
        <textarea value={text} onChange={(event) => { setText(event.target.value); resetPreview() }} placeholder="Paste a flight, hotel, train, or car confirmation…" rows={5} className={fieldClass} />
        <label className="block text-xs">Choose files
          <input key={`files-${fileKey}`} type="file" multiple accept="application/pdf,application/json,text/plain,.pdf,.json,.txt" onChange={(event) => chooseFiles(Array.from(event.target.files ?? []))} className="block w-full text-sm" />
        </label>
        <label className="block text-xs">Or choose a folder
          <input {...folderAttributes} key={`folder-${fileKey}`} type="file" multiple aria-label="Choose a folder" onChange={(event) => chooseFiles(Array.from(event.target.files ?? []))} className="block w-full text-sm" />
        </label>
        {files.length > 0 && <div className="text-xs">
          <p>{files.length} files selected. Pasted text will not be used.</p>
          <button type="button" onClick={() => { chooseFiles([]); setFileKey((key) => key + 1) }} className="underline">Use pasted text instead</button>
        </div>}
        <button type="button" onClick={() => void buildPreview()} disabled={busy || (!text.trim() && !files.length)} className="w-full rounded-lg bg-[var(--color-pine)] text-white px-3 py-2 text-sm disabled:opacity-50">{busy ? operation === 'save' ? 'Saving…' : 'Reading…' : 'Preview import'}</button>
      </fieldset>
      {error && <p role="alert" className="text-xs text-[var(--color-amber)]">{error}</p>}
      {success && <p role="status" className="text-xs text-[var(--color-pine)]">{success}</p>}
      {issues.length > 0 && <div className="text-xs space-y-1" role="status">
        <p>{issues.length} files need attention. Other files can still be saved.</p>
        {issues.map((issue, index) => <p key={index} className="break-words">{issue.name}: {issue.error}</p>)}
      </div>}
      {preview && (
        <fieldset disabled={busy} className="space-y-2 mt-2 min-w-0">
          <legend className="text-sm font-semibold">Review {plural(flights.length + hotels.length + bookings.length, 'record')} from {plural(documents.length, 'source')}</legend>
          {documents.map((doc, index) => <div key={index} className="rounded-lg border border-[var(--color-border)] p-2 text-xs space-y-1">
            <p className="font-semibold break-words">{doc.name}</p>
            <p>{plural(doc.preview.flights.length, 'flight')}, {plural(doc.preview.hotels.length, 'hotel')}, {plural(doc.preview.bookings.length, 'booking')}</p>
            {doc.preview.warnings.map((warning) => <p key={warning} className="text-[var(--color-amber)]">{warning}</p>)}
            {doc.file && <label>Original file
              <select aria-label={`Original file storage ${index + 1}`} value={doc.storage} onChange={(event) => setDocuments((items) => items.map((item, i) => i === index ? { ...item, storage: event.target.value as ReviewedDocument['storage'], acknowledgePublic: false } : item))} className={fieldClass}>
                <option value="public">Attach with bookings (no password)</option>
                <option value="vault">Protected vault</option>
                <option value="none">Do not keep the original file</option>
              </select>
            </label>}
            {doc.file && doc.preview.suggestVault && <p className="text-[var(--color-amber)]">Sensitive numbers were removed from extracted text. The original file may still contain them.</p>}
            {doc.file && doc.preview.suggestVault && doc.storage === 'public' && <label className="flex gap-2"><input type="checkbox" checked={doc.acknowledgePublic} onChange={(event) => setDocuments((items) => items.map((item, i) => i === index ? { ...item, acknowledgePublic: event.target.checked } : item))} />Store this sensitive original without a vault password.</label>}
          </div>)}
          <label className="flex gap-2 text-xs"><input type="checkbox" checked={keepSourceText} onChange={(event) => setKeepSourceText(event.target.checked)} />Keep redacted extracted text with each record</label>
          {duplicateCount > 0 && <div className="rounded-lg border border-[var(--color-border)] p-2 text-xs">
            <p>{duplicateCount} likely duplicates found in saved records or this batch. {keepDuplicates ? 'You chose to save additional copies.' : 'They will be skipped.'}</p>
            <label className="flex gap-2"><input type="checkbox" checked={keepDuplicates} onChange={(event) => setKeepDuplicates(event.target.checked)} />Keep duplicates as additional records</label>
          </div>}
          {flights.map((row, index) => (
            <article key={`flight-${index}`} className="rounded-lg border border-[var(--color-border)] p-2 space-y-1">
              <p className="text-xs text-[var(--color-muted)] break-words">{documents[row.document].name}</p>
              {duplicateFlights.has(row) && <p className="text-xs text-[var(--color-amber)]">Likely duplicate — {keepDuplicates ? 'will save another copy' : 'will skip'}.</p>}
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
              {row.warnings.filter((warning) => !row.date || !/ambiguous|unambiguous/i.test(warning)).map((warning) => <p key={warning} className="text-xs text-[var(--color-amber)]">{warning}</p>)}
              {row.include && !flightReady(row) && <p className="text-xs text-[var(--color-amber)]">Check the flight number, airport codes, departure date and times, or uncheck this row.</p>}
            </article>
          ))}

          {hotels.map((row, index) => (
            <article key={`hotel-${index}`} className="rounded-lg border border-[var(--color-border)] p-2 space-y-1">
              <p className="text-xs text-[var(--color-muted)] break-words">{documents[row.document].name}</p>
              {duplicateHotels.has(row) && <p className="text-xs text-[var(--color-amber)]">Likely duplicate — {keepDuplicates ? 'will save another copy' : 'will skip'}.</p>}
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
              {row.warnings.filter((warning) => !row.checkOut || !/ambiguous|unambiguous/i.test(warning)).map((warning) => <p key={warning} className="text-xs text-[var(--color-amber)]">{warning}</p>)}
              {row.include && !hotelReady(row) && <p className="text-xs text-[var(--color-amber)]">Check the hotel name and stay dates, or uncheck this row.</p>}
            </article>
          ))}

          {bookings.map((row, index) => (
            <article key={`booking-${index}`} className="rounded-lg border border-[var(--color-border)] p-2 space-y-1">
              <p className="text-xs text-[var(--color-muted)] break-words">{documents[row.document].name}</p>
              {duplicateBookings.has(row) && <p className="text-xs text-[var(--color-amber)]">Likely duplicate — {keepDuplicates ? 'will save another copy' : 'will skip'}.</p>}
              <label className="flex items-center gap-2 text-xs font-semibold">
                <input type="checkbox" checked={row.include} onChange={(event) => setBookingRows((rows) => rows.map((item, i) => i === index ? { ...item, include: event.target.checked } : item))} />
                Booking
              </label>
              <select aria-label="Booking category" value={row.category} onChange={(event) => changeBookingType(index, event.target.value as BookingCategory | 'hotel')} className={fieldClass}>
                <option value="hotel">Hotel</option>
                {(Object.keys(CATEGORY_LABELS) as BookingCategory[]).map((category) => (
                  <option key={category} value={category}>{CATEGORY_LABELS[category]}</option>
                ))}
              </select>
              <input aria-label="Booking label" value={row.label} onChange={(event) => setBookingRows((rows) => rows.map((item, i) => i === index ? { ...item, label: event.target.value } : item))} className={fieldClass} />
              <div className="flex gap-2">
                <input aria-label="Booking date" type="date" value={row.date} onChange={(event) => setBookingRows((rows) => rows.map((item, i) => i === index ? { ...item, date: event.target.value } : item))} className={fieldClass} />
                <input aria-label="Booking time" type="time" value={row.time} onChange={(event) => setBookingRows((rows) => rows.map((item, i) => i === index ? { ...item, time: event.target.value } : item))} className={fieldClass} />
              </div>
              {row.category === 'train' && <TrainFields value={row} onChange={(journey) => setBookingRows((rows) => rows.map((item, i) => i === index ? { ...item, ...journey } : item))} />}
              <textarea aria-label="Booking notes" value={row.notes} onChange={(event) => setBookingRows((rows) => rows.map((item, i) => i === index ? { ...item, notes: event.target.value } : item))} rows={2} className={fieldClass} />
              {row.warnings.filter((warning) => !row.date || !/ambiguous|unambiguous/i.test(warning)).map((warning) => <p key={warning} className="text-xs text-[var(--color-amber)]">{warning}</p>)}
              {row.include && !bookingReady(row) && <p className="text-xs text-[var(--color-amber)]">Check the label, date and times, or uncheck this row.</p>}
            </article>
          ))}

          <div className="sticky bottom-16 z-10 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-3 space-y-1 shadow-lg">
            <p className="text-xs" aria-live="polite">{includedCount} selected to save · {invalidCount} need correction · {!keepDuplicates ? duplicateCount : 0} duplicates skipped</p>
            {invalid && <p className="text-xs text-[var(--color-amber)]">Correct the highlighted fields or uncheck those records.</p>}
            {!tripChosen && <p className="text-xs text-[var(--color-amber)]">Choose an import trip above.</p>}
            {needsPublicAck && <p className="text-xs text-[var(--color-amber)]">Review storage for sensitive original files above.</p>}
            <button type="button" onClick={() => void save()} disabled={busy || !includedCount || invalid || needsPublicAck || !tripChosen} className="w-full rounded-lg bg-[var(--color-pine)] text-white px-3 py-2 text-sm disabled:opacity-50">{busy ? 'Saving…' : 'Save selected'}</button>
          </div>
        </fieldset>
      )}
    </Collapsible>
  )
}
