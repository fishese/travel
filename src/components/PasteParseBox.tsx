import { useState } from 'react'

interface Props {
  placeholder: string
  onParse: (text: string) => void
}

/**
 * Collapsed behind a text link until opened, so it doesn't compete with
 * the manual fields above it. Parsing only fills in fields — it never
 * saves anything by itself, so a bad parse just means editing a field
 * before hitting the real Add/Save button, same as a manual typo would.
 */
export function PasteParseBox({ placeholder, onParse }: Props) {
  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="text-xs text-[var(--color-pine)] underline">
        Or paste a confirmation to fill this in
      </button>
    )
  }

  return (
    <div className="space-y-1">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={placeholder}
        rows={4}
        className="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm"
      />
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => onParse(text)}
          disabled={!text.trim()}
          className="flex-1 rounded-lg bg-[var(--color-pine)] text-white px-3 py-2 text-xs disabled:opacity-50"
        >
          Fill in fields below
        </button>
        <button
          type="button"
          onClick={() => {
            setOpen(false)
            setText('')
          }}
          className="text-xs text-[var(--color-muted)] underline shrink-0"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
