import { useRef, useState } from 'react'
import { deleteFile, type VaultFile } from '../lib/fileVault'
import { useSavedItineraries, saveItinerary } from '../lib/itinerary'
import { Collapsible } from './Collapsible'
import { AddFormToggle } from './AddFormToggle'
import { SwipeToDelete } from './SwipeToDelete'
import { requestOpen } from '../lib/swipeCoordinator'
import { ItineraryViewer } from './ItineraryViewer'

interface Props {
  onMoveUp?: () => void
  onMoveDown?: () => void
}

export function ItinerarySection({ onMoveUp, onMoveDown }: Props) {
  const { files, refresh } = useSavedItineraries()
  const [viewing, setViewing] = useState<VaultFile | null>(null)
  const [showAddForm, setShowAddForm] = useState(() => files.length === 0)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function handleFilePicked(file: File | undefined) {
    if (!file) return
    setUploading(true)
    await saveItinerary(file)
    setUploading(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
    setShowAddForm(false)
    refresh()
  }

  async function handleDelete(file: VaultFile) {
    await deleteFile(file.id)
    refresh()
  }

  // Most recently saved first — whatever was just uploaded is presumably
  // for the next upcoming trip, so it's the one worth surfacing first.
  const sorted = [...files].sort((a, b) => b.savedAt.localeCompare(a.savedAt))

  return (
    <Collapsible id="itinerary" title="Itinerary" onMoveUp={onMoveUp} onMoveDown={onMoveDown}>
      <p className="text-xs text-[var(--color-muted)] mb-2">
        Your own hand-built itinerary pages (HTML) — save a few, viewable full-screen and offline once saved. Only
        one opens at a time.
      </p>

      <AddFormToggle label="Add itinerary" open={showAddForm} onOpenChange={setShowAddForm}>
        <input
          ref={fileInputRef}
          type="file"
          accept=".html,.htm,text/html"
          onChange={(e) => handleFilePicked(e.target.files?.[0])}
          disabled={uploading}
          className="w-full text-xs disabled:opacity-50"
        />
        {uploading && <p className="text-xs text-[var(--color-muted)] mt-1">Saving…</p>}
      </AddFormToggle>

      {sorted.length === 0 ? (
        <p className="text-sm text-[var(--color-muted)]">No itineraries saved yet.</p>
      ) : (
        <div className="space-y-2">
          {sorted.map((f) => (
            <SwipeToDelete key={f.id} id={f.id} label={f.label} onDelete={() => handleDelete(f)}>
              <div className="flex items-center justify-between gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-2">
                <button type="button" onClick={() => setViewing(f)} className="flex-1 min-w-0 text-left">
                  <p className="text-sm font-semibold truncate">{f.label}</p>
                  <p className="text-xs text-[var(--color-muted)]">
                    Saved {new Date(f.savedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => requestOpen(f.id)}
                  className="text-xs text-[var(--color-amber)] shrink-0"
                >
                  Remove
                </button>
              </div>
            </SwipeToDelete>
          ))}
        </div>
      )}

      {viewing && <ItineraryViewer file={viewing} onClose={() => setViewing(null)} />}
    </Collapsible>
  )
}
