import { useVaultFiles, openVaultFile, type VaultCategory } from '../lib/fileVault'
import { useActiveTrip, tripMatches } from '../lib/trips'

interface Props {
  linkedId: string
  /** Limit to one vault category. Omit it so a public booking file still shows on a flight or hotel it was imported with. */
  category?: VaultCategory
}

/** Documents linked to this record, including files that list it in linkedIds. */
export function LinkedFiles({ category, linkedId }: Props) {
  const { files } = useVaultFiles(category)
  const { activeTripId } = useActiveTrip()
  const linked = files.filter((f) => (f.linkedId === linkedId || f.linkedIds?.includes(linkedId)) && tripMatches(f, activeTripId))

  if (linked.length === 0) return null

  return (
    <div className="flex flex-wrap gap-1 mt-1">
      {linked.map((f) => (
        <button
          key={f.id}
          type="button"
          onClick={() => openVaultFile(f)}
          title={f.label}
          className="flex items-center gap-1 max-w-full rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-0.5 text-xs text-[var(--color-pine)]"
        >
          <span aria-hidden>📎</span>
          <span className="max-w-[9rem] truncate">{f.label}</span>
        </button>
      ))}
    </div>
  )
}
