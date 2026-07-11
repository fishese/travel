import { useMemo, useState } from 'react'
import { computeTip } from '../lib/tax'
import { getCountry } from '../lib/countries'
import { useCurrentCountry } from '../lib/currentCountry'
import { Collapsible } from './Collapsible'

// Generic fallback presets — used when no country is selected, or the
// selected country isn't in the DB yet (batches still pending).
const GENERIC_TIP_PRESETS = [0, 10, 15, 18, 20]

interface Props {
  currency: string
  onUseAmount: (value: number) => void
}

export function GratuityCalculator({ currency, onUseAmount }: Props) {
  const [countryIso2] = useCurrentCountry()
  const country = countryIso2 ? getCountry(countryIso2) : undefined

  const [bill, setBill] = useState('')
  const [tipPercent, setTipPercent] = useState(country?.tipping.default_percents[0] ?? 15)
  const [customTip, setCustomTip] = useState('')
  const [split, setSplit] = useState(1)

  const tipPresets = country ? country.tipping.default_percents : GENERIC_TIP_PRESETS
  const effectiveTip = customTip !== '' ? Number(customTip) || 0 : tipPercent
  const parsedBill = parseFloat(bill) || 0
  const result = useMemo(
    () => computeTip(parsedBill, effectiveTip, split),
    [parsedBill, effectiveTip, split],
  )

  return (
    <Collapsible title="Gratuity">
      {country ? (
        <p className="text-xs text-[var(--color-muted)] mb-2">
          {country.tipping.note_en}
        </p>
      ) : (
        <p className="text-xs text-[var(--color-muted)] mb-2">
          Generic presets — set your current country above for real tipping-culture defaults.
        </p>
      )}

      <label className="block mb-3">
        <span className="block text-xs text-[var(--color-muted)] mb-1">Bill amount ({currency})</span>
        <input
          inputMode="decimal"
          value={bill}
          onChange={(e) => setBill(e.target.value.replace(/[^0-9.]/g, ''))}
          className="w-full rounded-lg border border-[var(--color-border)] bg-white px-3 py-2 text-lg tabular"
        />
      </label>

      <div className="flex flex-wrap gap-2 mb-2">
        {tipPresets.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => {
              setTipPercent(p)
              setCustomTip('')
            }}
            aria-pressed={customTip === '' && tipPercent === p}
            className={
              'rounded-full px-3 py-1 text-xs border tabular ' +
              (customTip === '' && tipPercent === p
                ? 'bg-[var(--color-pine)] text-white border-[var(--color-pine)]'
                : 'border-[var(--color-border)] text-[var(--color-muted)] bg-white')
            }
          >
            {p}%
          </button>
        ))}
        <input
          value={customTip}
          onChange={(e) => setCustomTip(e.target.value.replace(/[^0-9.]/g, ''))}
          placeholder="custom %"
          className="w-20 rounded-full border border-[var(--color-border)] px-3 py-1 text-xs tabular"
        />
      </div>

      <label className="flex items-center gap-2 text-sm mb-3">
        Split between
        <input
          type="number"
          min={1}
          value={split}
          onChange={(e) => setSplit(Math.max(1, Number(e.target.value) || 1))}
          className="w-14 rounded border border-[var(--color-border)] px-2 py-1 tabular"
        />
        people
      </label>

      <div className="rounded-lg bg-[var(--color-pine-dim)] px-3 py-3 text-sm space-y-1">
        <div className="flex justify-between">
          <span>Tip</span>
          <span className="tabular">{result.tipAmount.toFixed(2)} {currency}</span>
        </div>
        <div className="flex justify-between font-semibold">
          <span>Total</span>
          <span className="tabular">{result.total.toFixed(2)} {currency}</span>
        </div>
        {split > 1 && (
          <div className="flex justify-between">
            <span>Per person</span>
            <span className="tabular">{result.perPerson.toFixed(2)} {currency}</span>
          </div>
        )}
      </div>

      <div className="flex gap-3 mt-2 text-xs">
        <button type="button" onClick={() => onUseAmount(parsedBill)} className="text-[var(--color-pine)] underline">
          Use bill in converter
        </button>
        <button type="button" onClick={() => onUseAmount(result.total)} className="text-[var(--color-pine)] underline">
          Use total in converter
        </button>
      </div>
    </Collapsible>
  )
}
