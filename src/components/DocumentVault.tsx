import { useEffect, useRef, useState } from 'react'
import { saveFile, deleteFile, fileObjectUrl, useVaultFiles, type VaultCategory, type VaultFile } from '../lib/fileVault'
import { Collapsible } from './Collapsible'

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

interface Props {
  onMoveUp?: () => void
  onMoveDown?: () => void
}

export function DocumentVault({ onMoveUp, onMoveDown }: Props) {
  const { files, loading, refresh } = useVaultFiles()
  const generalFiles = files.filter((f) => f.category !== 'dive-cert')

  const [label, setLabel] = useState('')
  const [category, setCategory] = useState<VaultCategory>('other')
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function handleUpload() {
    if (!pendingFile) return
    await saveFile(pendingFile, label.trim() || pendingFile.name, category, undefined)
    setLabel('')
    setPendingFile(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
    refresh()
  }

  async function handleDelete(id: string) {
    await deleteFile(id)
    refresh()
  }

  function openFile(file: VaultFile) {
    const url = fileObjectUrl(file)
    window.open(url, '_blank')
    // Deliberately not revoking immediately — the new tab needs the URL to
    // stay valid. It'll be cleaned up when that tab is closed/navigated;
    // a minor, bounded leak rather than a broken "open" action.
  }

  return (
    <Collapsible id="documents" title="Documents" onMoveUp={onMoveUp} onMoveDown={onMoveDown}>
      <p className="text-xs text-[var(--color-muted)] mb-2">
        E-tickets, booking confirmations, park/show reservations — stored on this device only. Not meant for ID
        documents (no PIN lock yet).
      </p>

      <div className="space-y-2 mb-2 pb-2 border-b border-dashed border-[var(--color-border)]">
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
              onClick={() => setCategory(c.value)}
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
        <button
          type="button"
          onClick={handleUpload}
          disabled={!pendingFile}
          className="w-full rounded-lg bg-[var(--color-pine)] text-white px-3 py-2 text-sm disabled:opacity-50"
        >
          Save to vault
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-[var(--color-muted)]">Loading…</p>
      ) : generalFiles.length === 0 ? (
        <p className="text-sm text-[var(--color-muted)]">No documents saved yet.</p>
      ) : (
        <div className="space-y-2">
          {generalFiles.map((f) => (
            <div key={f.id} className="flex items-center gap-2">
              <button type="button" onClick={() => openFile(f)} className="shrink-0">
                <VaultThumb file={f} />
              </button>
              <div className="min-w-0 flex-1">
                <p className="text-sm truncate">{f.label}</p>
                <p className="text-xs text-[var(--color-muted)] capitalize">{f.category}</p>
              </div>
              <button
                type="button"
                onClick={() => handleDelete(f.id)}
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
