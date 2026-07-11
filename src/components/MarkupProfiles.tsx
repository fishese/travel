import { useState } from 'react'
import { useMarkupProfiles, type MarkupProfile } from '../lib/markupProfiles'

export function MarkupProfileBar() {
  const { profiles, activeId, setActiveId, addProfile, updateProfile, removeProfile } =
    useMarkupProfiles()
  const [editing, setEditing] = useState(false)

  return (
    <div className="mb-3">
      <div className="flex flex-wrap gap-2">
        {profiles.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => setActiveId(p.id)}
            aria-pressed={p.id === activeId}
            className={
              'rounded-full px-3 py-1 text-xs border tabular ' +
              (p.id === activeId
                ? 'bg-[var(--color-pine)] text-white border-[var(--color-pine)]'
                : 'border-[var(--color-border)] text-[var(--color-muted)] bg-[var(--color-surface)]')
            }
          >
            {p.label} · {p.percent}%
          </button>
        ))}
        <button
          type="button"
          onClick={() => setEditing((e) => !e)}
          className="rounded-full px-3 py-1 text-xs border border-dashed border-[var(--color-border)] text-[var(--color-muted)]"
        >
          {editing ? 'Done' : 'Edit'}
        </button>
      </div>

      {editing && (
        <div className="mt-2 space-y-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
          {profiles.map((p) => (
            <ProfileRow key={p.id} profile={p} onChange={updateProfile} onRemove={removeProfile} />
          ))}
          <AddProfileRow onAdd={addProfile} />
        </div>
      )}
    </div>
  )
}

function ProfileRow({
  profile,
  onChange,
  onRemove,
}: {
  profile: MarkupProfile
  onChange: (id: string, patch: Partial<Pick<MarkupProfile, 'label' | 'percent'>>) => void
  onRemove: (id: string) => void
}) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <input
        value={profile.label}
        onChange={(e) => onChange(profile.id, { label: e.target.value })}
        className="flex-1 rounded border border-[var(--color-border)] px-2 py-1"
      />
      <input
        type="number"
        min={0}
        max={15}
        step={0.5}
        value={profile.percent}
        onChange={(e) => onChange(profile.id, { percent: Number(e.target.value) })}
        className="w-16 rounded border border-[var(--color-border)] px-2 py-1 tabular"
      />
      <span className="text-[var(--color-muted)]">%</span>
      <button
        type="button"
        onClick={() => onRemove(profile.id)}
        aria-label={`Remove ${profile.label}`}
        className="text-[var(--color-amber)] px-1"
      >
        ✕
      </button>
    </div>
  )
}

function AddProfileRow({ onAdd }: { onAdd: (label: string, percent: number) => void }) {
  const [label, setLabel] = useState('')
  const [percent, setPercent] = useState(0)

  return (
    <div className="flex items-center gap-2 text-sm pt-1 border-t border-dashed border-[var(--color-border)]">
      <input
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        placeholder="New profile (e.g. Amex)"
        className="flex-1 rounded border border-[var(--color-border)] px-2 py-1"
      />
      <input
        type="number"
        min={0}
        max={15}
        step={0.5}
        value={percent}
        onChange={(e) => setPercent(Number(e.target.value))}
        className="w-16 rounded border border-[var(--color-border)] px-2 py-1 tabular"
      />
      <span className="text-[var(--color-muted)]">%</span>
      <button
        type="button"
        disabled={!label.trim()}
        onClick={() => {
          onAdd(label.trim(), percent)
          setLabel('')
          setPercent(0)
        }}
        className="text-[var(--color-pine)] px-1 disabled:opacity-30"
      >
        Add
      </button>
    </div>
  )
}
