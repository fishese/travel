import { listCountries } from '../lib/countries'
import { useCurrentCountry } from '../lib/currentCountry'

export function CountrySelector() {
  const { iso2, setIso2, isOverridden, locationIso2, useWeatherLocation } = useCurrentCountry()
  const countries = listCountries()

  return (
    <div className="mb-2">
      <label className="block">
        <span className="block text-xs text-[var(--color-muted)] mb-1">
          Where are you? (unlocks real tip/tax defaults + cheatsheet)
        </span>
        <select
          value={iso2}
          onChange={(e) => setIso2(e.target.value)}
          className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm"
        >
          <option value="">Not set — generic defaults</option>
          {countries.map((c) => (
            <option key={c.iso2} value={c.iso2}>
              {c.name_en}
            </option>
          ))}
        </select>
      </label>

      <div className="flex items-center justify-between mt-1 gap-2">
        <p className="text-xs text-[var(--color-muted)]">
          {isOverridden
            ? 'Picked for this session — resets to your weather location on reload.'
            : locationIso2
              ? 'Following your weather location.'
              : 'Set a weather location above, or pick a country manually.'}
        </p>
        {isOverridden && locationIso2 && (
          <button
            type="button"
            onClick={useWeatherLocation}
            className="text-xs text-[var(--color-pine)] underline shrink-0"
          >
            Use weather location
          </button>
        )}
      </div>
    </div>
  )
}
