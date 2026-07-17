import type { ReactNode } from 'react'

interface Props {
  label: string
  open: boolean
  onOpenChange: (open: boolean) => void
  children: ReactNode
}

/**
 * Keeps the "add new" form out of the way until asked for, so opening a
 * section shows the list first rather than a form you have to scroll
 * past every time. Controlled (open/onOpenChange lifted to the parent)
 * so each section can auto-collapse this back to the + button right
 * after a successful add.
 */
export function AddFormToggle({ label, open, onOpenChange, children }: Props) {
  return (
    <div className="mb-2 pb-2 border-b border-dashed border-[var(--color-border)]">
      {!open ? (
        <button
          type="button"
          onClick={() => onOpenChange(true)}
          className="w-full rounded-lg border border-dashed border-[var(--color-pine)] text-[var(--color-pine)] px-3 py-2 text-sm font-medium"
        >
          + {label}
        </button>
      ) : (
        <div className="space-y-2">
          {children}
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="text-xs text-[var(--color-muted)] underline"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  )
}
