import { getCountry } from '../lib/countries'
import { useCurrentCountry } from '../lib/currentCountry'
import { Collapsible } from './Collapsible'

export function Cheatsheet() {
  const { iso2 } = useCurrentCountry()
  const country = getCountry(iso2)

  if (!country) return null

  return (
    <Collapsible title={`Cheatsheet — ${country.name_en}`}>
      <div className="space-y-3 text-sm">
        <div>
          <h3 className="text-xs font-semibold text-[var(--color-muted)] mb-1">Emergency</h3>
          <p className="tabular">
            Police {country.emergency.police} · Ambulance {country.emergency.ambulance} · Fire{' '}
            {country.emergency.fire}
          </p>
        </div>

        {country.dive_emergency.applicable && (
          <div>
            <h3 className="text-xs font-semibold text-[var(--color-muted)] mb-1">Dive emergency</h3>
            <p className="tabular">DAN: {country.dive_emergency.dan_hotline}</p>
            <p className="text-[var(--color-muted)]">{country.dive_emergency.nearest_hyperbaric_note_en}</p>
          </div>
        )}

        <div>
          <h3 className="text-xs font-semibold text-[var(--color-muted)] mb-1">HK Embassy / Consulate</h3>
          <p>{country.embassy_hk.name_en}</p>
          <p className="tabular">{country.embassy_hk.phone}</p>
          <p className="text-[var(--color-muted)]">{country.embassy_hk.address_en}</p>
        </div>

        <div>
          <h3 className="text-xs font-semibold text-[var(--color-muted)] mb-1">Power</h3>
          <p>
            {country.power.voltage} · Plug {country.power.plugs}
          </p>
          <p className="text-[var(--color-muted)]">{country.power.note}</p>
        </div>

        <div>
          <h3 className="text-xs font-semibold text-[var(--color-muted)] mb-1">Food</h3>
          <div className="flex flex-wrap gap-2">
            {country.food_links.map((f) => (
              <a
                key={f.url}
                href={f.url}
                target="_blank"
                rel="noreferrer"
                className="text-[var(--color-pine)] underline"
              >
                {f.label}
              </a>
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-xs font-semibold text-[var(--color-muted)] mb-1">Visa</h3>
          <p>{country.visa_caution.summary}</p>
        </div>

        {country.pre_arrival_forms.length > 0 && (
          <div>
            <h3 className="text-xs font-semibold text-[var(--color-muted)] mb-1">Pre-arrival forms</h3>
            <ul className="space-y-1">
              {country.pre_arrival_forms.map((f) => (
                <li key={f.id}>
                  <a href={f.official_url} target="_blank" rel="noreferrer" className="text-[var(--color-pine)] underline">
                    {f.name_en}
                  </a>
                  <span className="text-[var(--color-muted)]"> — {f.required_level}, {f.lead_days_before}d before</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <p className="text-xs text-[var(--color-muted)] pt-1 border-t border-dashed border-[var(--color-border)]">
          Verified as of {country.last_verified} — re-check before relying on this for an actual trip.
        </p>
      </div>
    </Collapsible>
  )
}
