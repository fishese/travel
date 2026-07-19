import { useRef, useState } from 'react'
import { useItinerary } from '../lib/itinerary'
import { hapticTick, hapticConfirm } from '../lib/haptics'
import { Collapsible } from './Collapsible'
import { ItineraryViewer } from './ItineraryViewer'

interface Props {
  onMoveUp?: () => void
  onMoveDown?: () => void
}

export function ItinerarySection({ onMoveUp, onMoveDown }: Props) {
  const { html, meta, upload, clear } = useItinerary()
  const [viewing, setViewing] = useState(false)
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [confirmingClear, setConfirmingClear] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function applyFile(file: File) {
    const content = await file.text()
    upload(file.name, content)
    setPendingFile(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function handleFilePicked(file: File | undefined) {
    if (!file) return
    if (html) {
      setPendingFile(file)
    } else {
      void applyFile(file)
    }
  }

  function handleClearClick() {
    if (!confirmingClear) {
      setConfirmingClear(true)
      hapticTick()
      setTimeout(() => setConfirmingClear(false), 3000)
      return
    }
    hapticConfirm()
    clear()
    setConfirmingClear(false)
  }

  return (
    <Collapsible id="itinerary" title="Itinerary" onMoveUp={onMoveUp} onMoveDown={onMoveDown}>
      <p className="text-xs text-[var(--color-muted)] mb-2">
        A single HTML file for the current trip — one of your own hand-built itinerary pages, viewable full-screen
        and offline once saved. Uploading a new one replaces whatever's here.
      </p>

      {meta && (
        <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-2 mb-2">
          <p className="text-sm font-semibold truncate">{meta.title}</p>
          <p className="text-xs text-[var(--color-muted)]">
            Saved {new Date(meta.uploadedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
          </p>
          <div className="flex gap-3 mt-2">
            <button
              type="button"
              onClick={() => setViewing(true)}
              className="text-xs text-[var(--color-pine)] underline"
            >
              View itinerary
            </button>
            <button
              type="button"
              onClick={handleClearClick}
              className={
                'text-xs underline ' +
                (confirmingClear ? 'text-[var(--color-danger)] font-medium' : 'text-[var(--color-amber)]')
              }
            >
              {confirmingClear ? 'Confirm remove?' : 'Remove'}
            </button>
          </div>
        </div>
      )}

      {pendingFile && (
        <div className="rounded-lg border border-[var(--color-border)] p-2 mb-2">
          <p className="text-xs mb-2">
            Replace the saved itinerary with <span className="font-medium">{pendingFile.name}</span>?
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => applyFile(pendingFile)}
              className="flex-1 rounded-lg bg-[var(--color-pine)] text-white px-3 py-2 text-xs"
            >
              Replace
            </button>
            <button
              type="button"
              onClick={() => {
                setPendingFile(null)
                if (fileInputRef.current) fileInputRef.current.value = ''
              }}
              className="flex-1 rounded-lg border border-[var(--color-border)] px-3 py-2 text-xs"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept=".html,.htm,text/html"
        onChange={(e) => handleFilePicked(e.target.files?.[0])}
        className="w-full text-xs"
      />

      {viewing && html && meta && (
        <ItineraryViewer html={html} title={meta.title} onClose={() => setViewing(false)} />
      )}
    </Collapsible>
  )
}
