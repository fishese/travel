import { useMemo, useState } from 'react'
import { currencyLabel, listCurrencyCodes } from '../lib/currency'

interface Props {
  value: string
  onChange: (code: string) => void
  label: string
}

export function CurrencyPicker({ value, onChange, label }: Props) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const codes = useMemo(() => listCurrencyCodes(), [])

  const filtered = useMemo(() => {
    const q = query.trim().toUpperCase()
    if (!q) return codes.slice(0, 40)
    return codes
      .filter((c) => {
        const { en } = currencyLabel(c)
        return c.includes(q) || en.toUpperCase().includes(q)
      })
      .slice(0, 40)
  }, [codes, query])

  const current = currencyLabel(value)

  return (
    <div className="relative">
      <span className="block text-xs text-[var(--color-muted)] mb-0.5">{label}</span>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-left"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="font-semibold tabular text-base">{value}</span>
        <span aria-hidden className="text-[var(--color-muted)]">▾</span>
      </button>
      {/* Full name lives outside the box, truncated to one line — so a long
          name (e.g. "United Arab Emirates Dirham") never makes this picker
          taller than its sibling and throws the row out of alignment. Tap
          the picker to see the full name in the dropdown if truncated. */}
      <p className="text-xs text-[var(--color-muted)] mt-0.5 truncate" title={current.en}>
        {current.en}
      </p>

      {open && (
        <div className="absolute z-10 mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] shadow-lg">
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search code or name…"
            className="w-full border-b border-[var(--color-border)] px-3 py-2 text-sm outline-none"
          />
          <ul role="listbox" className="max-h-56 overflow-y-auto">
            {filtered.map((code) => {
              const { en, zh } = currencyLabel(code)
              return (
                <li key={code}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={code === value}
                    onClick={() => {
                      onChange(code)
                      setOpen(false)
                      setQuery('')
                    }}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-[var(--color-amber-dim)] flex items-baseline justify-between"
                  >
                    <span>
                      <span className="font-semibold tabular">{code}</span>{' '}
                      <span className="text-[var(--color-muted)]">{en}</span>
                    </span>
                    {zh && <span className="text-[var(--color-muted)] text-xs">{zh}</span>}
                  </button>
                </li>
              )
            })}
            {filtered.length === 0 && (
              <li className="px-3 py-2 text-sm text-[var(--color-muted)]">No match</li>
            )}
          </ul>
        </div>
      )}
    </div>
  )
}
