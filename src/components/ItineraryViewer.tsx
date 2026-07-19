interface Props {
  html: string
  title: string
  onClose: () => void
}

export function ItineraryViewer({ html, title, onClose }: Props) {
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
      <iframe
        srcDoc={html}
        title={title}
        className="flex-1 w-full border-0"
        // allow-same-origin is what makes the sticky nav's #anchor links
        // actually scroll instead of opening blank — without it, a srcDoc
        // iframe's document address (about:srcdoc) has no real origin to
        // resolve an in-page fragment jump against, and some browsers fall
        // back to treating the click as a full navigation attempt, which
        // (combined with allow-popups below, needed for the itinerary's own
        // target="_blank" map links) can pop it open in a new tab pointed
        // at a URL that means nothing outside this iframe — a blank page.
        // Still safe without allow-scripts: this document has no <script>
        // tags (confirmed), so there's no code that could actually exploit
        // the origin access allow-same-origin grants.
        sandbox="allow-same-origin allow-popups allow-popups-to-escape-sandbox"
      />
    </div>
  )
}
