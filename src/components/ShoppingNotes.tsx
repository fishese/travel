import { useMemo, useState } from 'react'
import { calculateLine } from '../lib/napkinMath'
import { useSetting } from '../lib/useSetting'

interface Props {
  currency: string
  onUseAmount: (value: number) => void
}

export function ShoppingNotes({ currency, onUseAmount }: Props) {
  const [notes, setNotes] = useSetting('travel_shopping_notes', '')
  const [confirmingClear, setConfirmingClear] = useState(false)

  const lines = useMemo(
    () =>
      notes
        .split('\n')
        .map((text) => ({ text, result: text.trim() ? calculateLine(text) : null }))
        .filter((l) => l.result !== null),
    [notes],
  )

  const total = lines.reduce((sum, l) => sum + (l.result ?? 0), 0)

  function handleClearClick() {
    if (!confirmingClear) {
      setConfirmingClear(true)
      setTimeout(() => setConfirmingClear(false), 3000)
      return
    }
    setNotes('')
    setConfirmingClear(false)
  }

  return (
    <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 mt-3">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-sm font-semibold">Shopping notes</h2>
        {notes.trim() && (
          <button
            type="button"
            onClick={handleClearClick}
            className={
              'text-xs px-2 py-1 rounded ' +
              (confirmingClear ? 'bg-[var(--color-amber)] text-white' : 'text-[var(--color-muted)]')
            }
          >
            {confirmingClear ? 'Tap again to clear' : 'Clear'}
          </button>
        )}
      </div>

      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder={'Ceramic knife ¥2980 @ Donki\nSame knife, other stall 32 x 5\nWhiskey 30 per bottle /5'}
        rows={4}
        className="w-full rounded-lg border border-[var(--color-border)] bg-white px-3 py-2 text-sm resize-y"
      />
      <p className="text-xs text-[var(--color-muted)] mt-1">
        Lines with math (e.g. <span className="tabular">32 x 5</span>) show a total below — plain notes are left alone.
      </p>

      {lines.length > 0 && (
        <div className="mt-3 border-t border-dashed border-[var(--color-border)] pt-2 space-y-1">
          {lines.map((l, i) => (
            <div key={i} className="flex items-center justify-between text-sm gap-2">
              <span className="text-[var(--color-muted)] truncate">{l.text.trim()}</span>
              <span className="flex items-center gap-2 shrink-0">
                <span className="tabular font-semibold">
                  {l.result!.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                </span>
                <button
                  type="button"
                  onClick={() => onUseAmount(l.result!)}
                  className="text-xs text-[var(--color-pine)] underline"
                >
                  use
                </button>
              </span>
            </div>
          ))}
          {lines.length > 1 && (
            <div className="flex items-center justify-between text-sm pt-1 border-t border-[var(--color-border)] font-semibold">
              <span>Total</span>
              <span className="tabular">
                {total.toLocaleString(undefined, { maximumFractionDigits: 2 })} {currency}
              </span>
            </div>
          )}
        </div>
      )}
    </section>
  )
}
