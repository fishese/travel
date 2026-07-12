interface Props {
  name: string
  address: string
  mapsUrl?: string
  onClose: () => void
}

export function ShowToDriver({ name, address, mapsUrl, onClose }: Props) {
  return (
    <div className="fixed inset-0 z-50 bg-[var(--color-paper)] flex flex-col items-center justify-center p-6 text-center gap-4">
      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        className="absolute top-4 right-4 text-2xl text-[var(--color-muted)] w-10 h-10 flex items-center justify-center"
      >
        ✕
      </button>
      <p className="text-sm text-[var(--color-muted)]">{name}</p>
      <p className="text-3xl font-display leading-snug">{address}</p>
      {mapsUrl && (
        <a
          href={mapsUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-2 rounded-lg bg-[var(--color-pine)] text-white px-4 py-2 text-sm"
        >
          Open in Maps
        </a>
      )}
    </div>
  )
}
