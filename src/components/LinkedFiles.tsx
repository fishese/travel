import { useVaultFiles, openVaultFile, type VaultCategory } from '../lib/fileVault'

interface Props {
  category: VaultCategory
  linkedId: string
}

/**
 * Surfaces documents linked to this specific record right where you're
 * already looking at it, instead of needing to open Documents separately
 * and check each file's link. Same "not reactive across components"
 * tradeoff as the rest of the file vault (see fileVault.ts's
 * useVaultFiles comment) — a document linked while this row is already
 * mounted won't appear here until the section is reopened, consistent
 * with how Documents' own list already behaves.
 */
export function LinkedFiles({ category, linkedId }: Props) {
  const { files } = useVaultFiles(category)
  const linked = files.filter((f) => f.linkedId === linkedId)

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
