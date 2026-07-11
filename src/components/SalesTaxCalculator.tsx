import { useEffect, useMemo, useState } from 'react'
import { computeSalesTax, type TaxMode } from '../lib/tax'
import { getCountry } from '../lib/countries'
import { useCurrentCountry } from './CountrySelector'
import { Collapsible } from './Collapsible'

// Generic reference rates — used when no country is selected, or the
// selected country isn't in the DB yet (batches still pending).
const REFERENCE_RATES = [5, 7, 8, 10, 15, 20]

interface Props {
  currency: string
  onUseAmount: (value: number) => void
}

export function SalesTaxCalculator({ currency, onUseAmount }: Props) {
  const [countryIso2] = useCurrentCountry()
  const country = countryIso2 ? getCountry(countryIso2) : undefined

  // tax_included countries (JP, UK, most of EU/Asia) mostly just want to
  // confirm the shelf price is final — "extract" is the more useful default
  // there. tax_added countries (US, parts of CA) want "add" as primary,
  // matching the original spec's price_display -> mode mapping.
  const [mode, setMode] = useState<TaxMode>(country?.sales_tax.price_display === 'tax_included' ? 'extract' : 'add')
  const [amount, setAmount] = useState('')
  const [rate, setRate] = useState(country ? String(country.sales_tax.default_rate_percent) : '')

  // re-sync mode/rate when the selected country changes
  useEffect(() => {
    if (country) {
      setMode(country.sales_tax.price_display === 'tax_included' ? 'extract' : 'add')
      setRate(String(country.sales_tax.default_rate_percent))
    }
  }, [countryIso2]) // eslint-disable-line react-hooks/exhaustive-deps

  const parsedAmount = parseFloat(amount) || 0
  const parsedRate = parseFloat(rate) || 0
  const result = useMemo(
    () => computeSalesTax(parsedAmount, parsedRate, mode),
    [parsedAmount, parsedRate, mode],
  )

  return (
    <Collapsible title="Sales tax / VAT">
      {country ? (
        <div className="text-xs text-[var(--color-muted)] mb-2 space-y-1">
          <p>{country.sales_tax.note_en}</p>
          {country.tax_refund.available && (
            <p>
              Tourist refund available: <strong>{country.tax_refund.scheme_name_en}</strong> (~
              {country.tax_refund.typical_rate_percent}%) — {country.tax_refund.min_purchase_note_en}.{' '}
              {country.tax_refund.where_to_claim_en}.
            </p>
          )}
        </div>
      ) : (
        <p className="text-xs text-[var(--color-muted)] mb-2">
          No country selected, so nothing is pre-filled — enter the local rate yourself, or set your current country above for real defaults.
        </p>
      )}

      <div className="flex rounded-lg border border-[var(--color-border)] overflow-hidden mb-3 text-sm">
        <button
          type="button"
          onClick={() => setMode('add')}
          aria-pressed={mode === 'add'}
          className={'flex-1 py-2 ' + (mode === 'add' ? 'bg-[var(--color-pine)] text-white' : 'bg-white')}
        >
          Add tax
        </button>
        <button
          type="button"
          onClick={() => setMode('extract')}
          aria-pressed={mode === 'extract'}
          className={'flex-1 py-2 ' + (mode === 'extract' ? 'bg-[var(--color-pine)] text-white' : 'bg-white')}
        >
          Extract tax
        </button>
      </div>

      <label className="block mb-3">
        <span className="block text-xs text-[var(--color-muted)] mb-1">
          {mode === 'add' ? 'Shelf / subtotal' : 'Tax-included total'} ({currency})
        </span>
        <input
          inputMode="decimal"
          value={amount}
          onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ''))}
          className="w-full rounded-lg border border-[var(--color-border)] bg-white px-3 py-2 text-lg tabular"
        />
      </label>

      <label className="block mb-2">
        <span className="block text-xs text-[var(--color-muted)] mb-1">Tax rate %</span>
        <input
          inputMode="decimal"
          value={rate}
          onChange={(e) => setRate(e.target.value.replace(/[^0-9.]/g, ''))}
          placeholder="e.g. 8.875"
          className="w-full rounded-lg border border-[var(--color-border)] bg-white px-3 py-2 text-lg tabular"
        />
      </label>
      {!country && (
        <div className="flex flex-wrap gap-2 mb-3">
          {REFERENCE_RATES.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRate(String(r))}
              className="rounded-full px-3 py-1 text-xs border border-[var(--color-border)] text-[var(--color-muted)] bg-white tabular"
            >
              {r}%
            </button>
          ))}
        </div>
      )}

      <div className="rounded-lg bg-[var(--color-pine-dim)] px-3 py-3 text-sm space-y-1">
        <div className="flex justify-between">
          <span>Pre-tax</span>
          <span className="tabular">{result.preTax.toFixed(2)} {currency}</span>
        </div>
        <div className="flex justify-between">
          <span>Tax</span>
          <span className="tabular">{result.taxAmount.toFixed(2)} {currency}</span>
        </div>
        <div className="flex justify-between font-semibold">
          <span>Total (at register)</span>
          <span className="tabular">{result.total.toFixed(2)} {currency}</span>
        </div>
      </div>

      <button
        type="button"
        onClick={() => onUseAmount(result.total)}
        className="mt-2 text-xs text-[var(--color-pine)] underline"
      >
        Use total in converter
      </button>
    </Collapsible>
  )
}
