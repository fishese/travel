import { useState } from 'react'

export function RawTextDisclosure({ text }: { text: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="mt-1">
      <button type="button" onClick={() => setOpen((o) => !o)} className="text-xs text-[var(--color-muted)] underline">
        {open ? 'Hide' : 'View'} pasted text
      </button>
      {open && (
        <pre className="mt-1 whitespace-pre-wrap break-words rounded-lg border border-[var(--color-border)] bg-[var(--color-paper)] p-2 text-xs text-[var(--color-muted)]">
          {text}
        </pre>
      )}
    </div>
  )
}
