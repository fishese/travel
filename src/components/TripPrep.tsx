import { useSetting } from '../lib/useSetting'

const CHECKS = [
  ['backup', 'Exported a backup and tested restore'],
  ['itinerary', 'Saved the itinerary for offline use'],
  ['maps', 'Downloaded offline maps / transport info'],
  ['connectivity', 'Prepared eSIM, roaming or local SIM'],
  ['forms', 'Completed required arrival forms'],
  ['insurance', 'Saved insurance details or card in Documents'],
  ['contacts', 'Saved emergency and embassy contacts'],
] as const

export function TripPrep() {
  const [checks, setChecks] = useSetting<Record<string, boolean>>('travel_prep_checks', {})
  const completed = CHECKS.filter(([id]) => checks[id]).length

  return (
    <section className="rounded-xl border border-[var(--color-border)] p-3 mt-2">
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-sm font-semibold">Before you go</h2>
        <span className="text-xs text-[var(--color-muted)]">{completed}/{CHECKS.length}</span>
      </div>
      <p className="text-xs text-[var(--color-muted)] mb-2">A short offline-readiness check for the things most likely to matter after take-off.</p>
      <div className="space-y-1">
        {CHECKS.map(([id, label]) => (
          <label key={id} className="flex items-start gap-2 text-sm">
            <input type="checkbox" checked={Boolean(checks[id])} onChange={(e) => setChecks((prev) => ({ ...prev, [id]: e.target.checked }))} className="mt-0.5" />
            <span>{label}</span>
          </label>
        ))}
      </div>
    </section>
  )
}
