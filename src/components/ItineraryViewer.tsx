import { useEffect, useState } from 'react'
import { fileObjectUrl, type VaultFile } from '../lib/fileVault'

interface Props {
  file: VaultFile
  onClose: () => void
}

export function ItineraryViewer({ file, onClose }: Props) {
  const [url, setUrl] = useState<string | null>(null)

  // A real blob: URL (same helper Documents/dive-cert photos already use)
  // rather than the iframe's srcDoc attribute — srcDoc documents live at
  // the special about:srcdoc address, which turned out to be unreliable
  // for in-page #anchor navigation (a sticky nav's jump links opened
  // blank instead of scrolling). A blob URL is a normal, resolvable
  // address, so the browser resolves a fragment link against it the same
  // way it would for any other page.
  useEffect(() => {
    const objectUrl = fileObjectUrl(file)
    setUrl(objectUrl)
    return () => URL.revokeObjectURL(objectUrl)
  }, [file])

  return (
    <div className="fixed inset-0 z-50 bg-[var(--color-paper)] flex flex-col">
      <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--color-border)] shrink-0">
        <span className="text-sm font-semibold truncate">{file.label}</span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="text-xl text-[var(--color-muted)] w-9 h-9 flex items-center justify-center shrink-0"
        >
          ✕
        </button>
      </div>
      {/* No sandbox attribute — meant for the person's own hand-built
       * itinerary pages (confirmed script-free), and full trust avoided
       * two separate rounds of sandbox flag combinations each breaking
       * the sticky nav's in-page links in different ways. */}
      {url && <iframe src={url} title={file.label} className="flex-1 w-full border-0" />}
    </div>
  )
}
