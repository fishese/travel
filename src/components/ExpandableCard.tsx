import { useState, type ReactNode } from 'react'

interface Props {
  /** Always-visible summary — gets its own click target to toggle expand,
   * separate from any sibling action buttons (e.g. Remove) so those don't
   * also trigger the toggle. */
  header: ReactNode
  children: ReactNode
  defaultOpen?: boolean
}

export function ExpandableCard({ header, children, defaultOpen = false }: Props) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div>
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="w-full text-left">
        {header}
      </button>
      {open && <div className="mt-2">{children}</div>}
    </div>
  )
}
