import { useEffect, useRef, useState } from 'react'
import {
  saveFile,
  deleteFile,
  fileObjectUrl,
  openVaultFile,
  useVaultFiles,
  type VaultCategory,
  type VaultFile,
} from '../lib/fileVault'
import { useSavedFlights, type SavedFlight } from '../lib/flights'
import { useSavedHotels, type SavedHotel } from '../lib/hotels'
import { useSavedBookings, type Booking } from '../lib/bookings'
import { localDateStr, localTomorrowStr } from '../lib/dateUtils'
import { Collapsible } from './Collapsible'
import { AddFormToggle } from './AddFormToggle'
import { SwipeToDelete } from './SwipeToDelete'
import { requestOpen } from '../lib/swipeCoordinator'

const CATEGORIES: { value: VaultCategory; label: string }[] = [
  { value: 'flight', label: 'Flight' },
  { value: 'hotel', label: 'Hotel' },
  { value: 'booking', label: 'Booking' },
  { value: 'other', label: 'Other' },
]

function VaultThumb({ file }: { file: VaultFile }) {
  const [url, setUrl] = useState<string | null>(null)
  const isImage = file.mimeType.startsWith('image/')

  useEffect(() => {
    if (!isImage) return
    const u = fileObjectUrl(file)
    setUrl(u)
    return () => URL.revokeObjectURL(u)
  }, [file, isImage])

  if (isImage && url) {
    return <img src={url} alt={file.label} className="w-12 h-12 rounded-lg object-cover shrink-0" />
  }
  return (
    <div className="w-12 h-12 rounded-lg bg-[var(--color-pine-dim)] flex items-center justify-center text-lg shrink-0">
      📄
    </div>
  )
}

interface LinkOption {
  id: string
  label: string
}

function linkOptionsFor(
  category: VaultCategory,
  flights: SavedFlight[],
  hotels: SavedHotel[],
  bookings: Booking[],
): LinkOption[] {
  if (category === 'flight') return flights.map((f) => ({ id: f.id, label: `${f.flightIata} — ${f.date}` }))
  if (category === 'hotel')
    return hotels.filter((h) => h.checkIn).map((h) => ({ id: h.id, label: `${h.name} — ${h.checkIn}` }))
  if (category === 'booking') return bookings.map((b) => ({ id: b.id, label: `${b.label} — ${b.date}` }))
  return []
}

/** The date of whatever this document is linked to, if anything — used to
 * surface documents for today/tomorrow first, same spirit as the unified
 * reminder feed but scoped to the vault's own list. */
function getLinkedDate(
  file: VaultFile,
  flights: SavedFlight[],
  hotels: SavedHotel[],
  bookings: Booking[],
): string | undefined {
  if (!file.linkedId) return undefined
  if (file.category === 'flight') return flights.find((f) => f.id === file.linkedId)?.date
  if (file.category === 'hotel') return hotels.find((h) => h.id === file.linkedId)?.checkIn
  if (file.category === 'booking') return bookings.find((b) => b.id === file.linkedId)?.date
  return undefined
}

function dateRank(date: string | undefined, today: string, tomorrow: string): number {
  if (!date) return 3 // unlinked — no particular urgency, sorts last
  if (date === today) return 0
  if (date === tomorrow) return 1
  if (date > today) return 2 // future, ascending within this rank
  return 3 // past — no longer urgent, sorts with unlinked
}

interface Props {
  onMoveUp?: () => void
  onMoveDown?: () => void
}

export function DocumentVault({ onMoveUp, onMoveDown }: Props) {
  const { files, loading, refresh } = useVaultFiles()
  const [flights] = useSavedFlights()
  const [hotels] = useSavedHotels()
  const [bookings] = useSavedBookings()
  const generalFiles = files.filter((f) => f.category !== 'dive-cert' && f.category !== 'itinerary')

  const [label, setLabel] = useState('')
  const [category, setCategory] = useState<VaultCategory>('other')
  const [linkedId, setLinkedId] = useState('')
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [showAddForm, setShowAddForm] = useState(() => generalFiles.length === 0)

  const linkOptions = linkOptionsFor(category, flights, hotels, bookings)
  const today = localDateStr()
  const tomorrow = localTomorrowStr()

  async function handleUpload() {
    if (!pendingFile) return
    await saveFile(pendingFile, label.trim() || pendingFile.name, category, linkedId || undefined)
    setLabel('')
    setPendingFile(null)
    setLinkedId('')
    if (fileInputRef.current) fileInputRef.current.value = ''
    setShowAddForm(false)
    refresh()
  }

  async function handleDelete(id: string) {
    await deleteFile(id)
    refresh()
  }



  const sorted = [...generalFiles].sort((a, b) => {
    const dateA = getLinkedDate(a, flights, hotels, bookings)
    const dateB = getLinkedDate(b, flights, hotels, bookings)
    const rankA = dateRank(dateA, today, tomorrow)
    const rankB = dateRank(dateB, today, tomorrow)
    if (rankA !== rankB) return rankA - rankB
    if (rankA === 2) return (dateA ?? '').localeCompare(dateB ?? '') // future: soonest first
    return 0
  })

  function dateBadge(file: VaultFile): string | null {
    const d = getLinkedDate(file, flights, hotels, bookings)
    if (!d) return null
    if (d === today) return 'Today'
    if (d === tomorrow) return 'Tomorrow'
    return d
  }

  return (
    <Collapsible id="documents" title="Documents" onMoveUp={onMoveUp} onMoveDown={onMoveDown}>
      <p className="text-xs text-[var(--color-muted)] mb-2">
        E-tickets, booking confirmations, park/show reservations — stored on this device only. Not meant for ID
        documents (no PIN lock yet). Link a document to a flight/hotel/booking to surface it automatically on the
        relevant day.
      </p>

      <AddFormToggle label="Add document" open={showAddForm} onOpenChange={setShowAddForm}>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,application/pdf"
          onChange={(e) => setPendingFile(e.target.files?.[0] ?? null)}
          className="w-full text-xs"
        />
        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Label (optional — defaults to file name)"
          className="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm"
        />
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((c) => (
            <button
              key={c.value}
              type="button"
              onClick={() => {
                setCategory(c.value)
                setLinkedId('')
              }}
              aria-pressed={category === c.value}
              className={
                'rounded-full px-3 py-1 text-xs border ' +
                (category === c.value
                  ? 'bg-[var(--color-pine)] text-white border-[var(--color-pine)]'
                  : 'border-[var(--color-border)] text-[var(--color-muted)] bg-[var(--color-surface)]')
              }
            >
              {c.label}
            </button>
          ))}
        </div>

        {category !== 'other' && (
          <select
            value={linkedId}
            onChange={(e) => setLinkedId(e.target.value)}
            className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm"
          >
            <option value="">Not linked to a specific one</option>
            {linkOptions.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
            {linkOptions.length === 0 && <option disabled>No saved {category}s yet</option>}
          </select>
        )}

        <button
          type="button"
          onClick={handleUpload}
          disabled={!pendingFile}
          className="w-full rounded-lg bg-[var(--color-pine)] text-white px-3 py-2 text-sm disabled:opacity-50"
        >
          Save to vault
        </button>
      </AddFormToggle>

      {loading ? (
        <p className="text-sm text-[var(--color-muted)]">Loading…</p>
      ) : sorted.length === 0 ? (
        <p className="text-sm text-[var(--color-muted)]">No documents saved yet.</p>
      ) : (
        <div className="space-y-2">
          {sorted.map((f) => {
            const badge = dateBadge(f)
            const isUrgent = badge === 'Today' || badge === 'Tomorrow'
            return (
              <SwipeToDelete key={f.id} id={f.id} label={f.label} onDelete={() => handleDelete(f.id)}>
                <div className="flex items-center gap-2 bg-[var(--color-surface)] p-1">
                  <button type="button" onClick={() => openVaultFile(f)} className="shrink-0">
                    <VaultThumb file={f} />
                  </button>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm truncate">{f.label}</p>
                    <p className="text-xs text-[var(--color-muted)] capitalize">
                      {f.category}
                      {badge && (
                        <span className={isUrgent ? 'text-[var(--color-pine)] font-semibold' : ''}> · {badge}</span>
                      )}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => requestOpen(f.id)}
                    className="text-xs text-[var(--color-amber)] shrink-0"
                  >
                    Remove
                  </button>
                </div>
              </SwipeToDelete>
            )
          })}
        </div>
      )}
    </Collapsible>
  )
}
