import { getAirportsForCountry, getCountry } from '../lib/countries'
import { useCurrentCountry } from '../lib/currentCountry'
import { Collapsible } from './Collapsible'

export function Cheatsheet() {
  const { iso2 } = useCurrentCountry()
  const country = getCountry(iso2)
  const airports = country ? getAirportsForCountry(country.iso2) : []

  if (!country) return null

  return (
    <Collapsible id="cheatsheet" title={`Cheatsheet — ${country.name_en}`} defaultOpen>
      <div className="space-y-2 text-sm">
        <div>
          <h3 className="text-xs font-semibold text-[var(--color-muted)] mb-1">Emergency</h3>
          <p className="tabular text-xs">
            <a className="underline" href={`tel:${country.emergency.police.replace(/[^\d+]/g, '')}`}>Call police</a> · <a className="underline" href={`tel:${country.emergency.ambulance.replace(/[^\d+]/g, '')}`}>Call ambulance</a> · <a className="underline" href={`tel:${country.emergency.fire.replace(/[^\d+]/g, '')}`}>Call fire</a>
          </p>
          <p className="tabular">
            Police {country.emergency.police} · Ambulance {country.emergency.ambulance} · Fire{' '}
            {country.emergency.fire}
          </p>
        </div>

        <p className="text-xs text-[var(--color-muted)]">Emergency numbers are tap-to-call where supported.</p>

        {country.dive_emergency.applicable && (
          <div>
            <h3 className="text-xs font-semibold text-[var(--color-muted)] mb-1">Dive emergency</h3>
            <p className="tabular">DAN: <a className="underline" href={`tel:${country.dive_emergency.dan_hotline.replace(/[^\d+]/g, '')}`}>{country.dive_emergency.dan_hotline}</a></p>
            <p className="text-[var(--color-muted)]">{country.dive_emergency.nearest_hyperbaric_note_en}</p>
            <a href={country.dive_emergency.official_url} target="_blank" rel="noreferrer" className="text-[var(--color-pine)] underline">DAN information</a>
          </div>
        )}

        <div>
          <h3 className="text-xs font-semibold text-[var(--color-muted)] mb-1">HK Embassy / Consulate</h3>
          <p>{country.embassy_hk.name_en}</p>
          <p className="tabular"><a className="underline" href={`tel:${country.embassy_hk.phone.replace(/[^\d+]/g, '')}`}>{country.embassy_hk.phone}</a></p>
          <p className="text-[var(--color-muted)]">{country.embassy_hk.address_en}</p>
          <a href={country.embassy_hk.official_url} target="_blank" rel="noreferrer" className="text-[var(--color-pine)] underline">Official contact page</a>
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

        {airports.length > 0 && (
          <div>
            <h3 className="text-xs font-semibold text-[var(--color-muted)] mb-1">Airport to city</h3>
            <div className="space-y-1">
              {airports.map((airport) => (
                <p key={airport.iata}>
                  <span className="font-medium">{airport.iata}</span> · {airport.typical_transport_en} · ~{airport.typical_minutes} min · arrive {airport.international_departure_buffer_hours}h before international departure
                  <span className="block text-xs text-[var(--color-muted)]">{airport.assumptions_en}</span>
                </p>
              ))}
            </div>
          </div>
        )}

        <div>
          <h3 className="text-xs font-semibold text-[var(--color-muted)] mb-1">Visa</h3>
          <p>{country.visa_caution.summary}</p>
          <a href={country.visa_caution.official_url} target="_blank" rel="noreferrer" className="text-[var(--color-pine)] underline">Check official visa source</a>
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
