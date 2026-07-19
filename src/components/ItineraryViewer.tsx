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
        // No allow-scripts and no allow-same-origin: this document never
        // needs to run JS (confirmed — it's pure static HTML/CSS), and an
        // opaque, script-free sandbox is the safer default for rendering
        // arbitrary uploaded HTML regardless. allow-popups (+ letting the
        // popup itself escape the sandbox) is only there so the itinerary's
        // own target="_blank" map links still open normally.
        sandbox="allow-popups allow-popups-to-escape-sandbox"
      />
    </div>
  )
}
