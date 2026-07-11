import { listCountries } from '../lib/countries'
import { useCurrentCountry } from '../lib/currentCountry'

export function CountrySelector() {
  const [iso2, setIso2] = useCurrentCountry()
  const countries = listCountries()

  return (
    <div className="mb-3">
      <label className="block">
        <span className="block text-xs text-[var(--color-muted)] mb-1">
          Where are you? (unlocks real tip/tax defaults + cheatsheet)
        </span>
        <select
          value={iso2}
          onChange={(e) => setIso2(e.target.value)}
          className="w-full rounded-lg border border-[var(--color-border)] bg-white px-3 py-2 text-sm"
        >
          <option value="">Not set — generic defaults</option>
          {countries.map((c) => (
            <option key={c.iso2} value={c.iso2}>
              {c.name_en}
            </option>
          ))}
        </select>
      </label>
      {countries.length < 19 && (
        <p className="text-xs text-[var(--color-muted)] mt-1">
          {countries.length} of 19 planned destinations loaded so far — more arrive as later batches finish.
        </p>
      )}
    </div>
  )
}
