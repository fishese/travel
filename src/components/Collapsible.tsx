import { useState, type ReactNode } from 'react'

export function Collapsible({ title, children }: { title: string; children: ReactNode }) {
  const [open, setOpen] = useState(false)
  return (
    <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] mt-3">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold"
      >
        {title}
        <span aria-hidden className="text-[var(--color-muted)]">{open ? '−' : '+'}</span>
      </button>
      {open && <div className="px-4 pb-4">{children}</div>}
    </section>
  )
}
