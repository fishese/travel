import type { ReactNode } from 'react'
import { useSetting } from '../lib/useSetting'

interface Props {
  id: string
  title: string
  children: ReactNode
  onMoveUp?: () => void
  onMoveDown?: () => void
}

export function Collapsible({ id, title, children, onMoveUp, onMoveDown }: Props) {
  // Persisted per section — whatever you leave open stays open next time,
  // which is the "pinning" behavior without needing a separate pin concept.
  // Defaults to closed, matching the previous (non-persisted) behavior.
  const [open, setOpen] = useSetting(`travel_section_open_${id}`, false)

  return (
    <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] mt-2">
      <div className="w-full flex items-center justify-between px-3 py-2">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className="flex-1 text-left text-sm font-semibold flex items-center gap-2 min-w-0"
        >
          <span className="truncate">{title}</span>
          <span aria-hidden className="text-[var(--color-muted)] shrink-0">{open ? '−' : '+'}</span>
        </button>
        {(onMoveUp || onMoveDown) && (
          <div className="flex items-center gap-0.5 shrink-0 ml-2">
            <button
              type="button"
              onClick={onMoveUp}
              disabled={!onMoveUp}
              aria-label={`Move ${title} up`}
              className="text-[var(--color-muted)] disabled:opacity-20 w-6 h-6 flex items-center justify-center text-xs"
            >
              ▲
            </button>
            <button
              type="button"
              onClick={onMoveDown}
              disabled={!onMoveDown}
              aria-label={`Move ${title} down`}
              className="text-[var(--color-muted)] disabled:opacity-20 w-6 h-6 flex items-center justify-center text-xs"
            >
              ▼
            </button>
          </div>
        )}
      </div>
      {open && <div className="px-3 pb-3">{children}</div>}
    </section>
  )
}
