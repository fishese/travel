import { useEffect, useState } from 'react'

interface Props {
  html: string
  title: string
  onClose: () => void
}

export function ItineraryViewer({ html, title, onClose }: Props) {
  const [url, setUrl] = useState<string | null>(null)

  // A real blob: URL rather than the iframe's srcDoc attribute — srcDoc
  // documents live at the special about:srcdoc address, which turned out
  // to be unreliable for in-page #anchor navigation across browsers (the
  // sticky nav links were opening blank instead of scrolling). A blob URL
  // is a normal, resolvable address, so the browser can resolve a fragment
  // link against it the same way it would for any other page. Same
  // create/revoke pattern already used for vault files (lib/fileVault.ts).
  useEffect(() => {
    const blobUrl = URL.createObjectURL(new Blob([html], { type: 'text/html' }))
    setUrl(blobUrl)
    return () => URL.revokeObjectURL(blobUrl)
  }, [html])

  return (
    <div className="fixed inset-0 z-50 bg-[var(--color-paper)] flex flex-col">
      <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--color-border)] shrink-0">
        <span className="text-sm font-semibold truncate">{title}</span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="text-xl text-[var(--color-muted)] w-9 h-9 flex items-center justify-center shrink-0"
        >
          ✕
        </button>
      </div>
      {/* No sandbox attribute — two rounds of trying to keep this
       * restricted (no allow-same-origin, then adding it back) both broke
       * the sticky nav's in-page links in ways that weren't worth a third
       * guess. This is meant for the person's own hand-built itinerary
       * pages, confirmed script-free, so full trust is the pragmatic
       * call here over continuing to chase sandbox flag interactions. */}
      {url && <iframe src={url} title={title} className="flex-1 w-full border-0" />}
    </div>
  )
}
