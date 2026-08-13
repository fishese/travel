import { useState } from 'react'
import {
  CATEGORY_EMOJI,
  CATEGORY_LABELS,
  type BookingCategory,
  type BookingFieldInput,
} from '../lib/bookings'

const CATEGORIES = Object.keys(CATEGORY_EMOJI) as BookingCategory[]

interface Props {
  initial: BookingFieldInput
  onSave: (fields: BookingFieldInput) => void
  onCancel: () => void
}

export function BookingEditForm({ initial, onSave, onCancel }: Props) {
  const [category, setCategory] = useState<BookingCategory>(initial.category)
  const [date, setDate] = useState(initial.date)
  const [time, setTime] = useState(initial.time ?? '')
  const [label, setLabel] = useState(initial.label)
  const [notes, setNotes] = useState(initial.notes ?? '')

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {CATEGORIES.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setCategory(c)}
            aria-pressed={category === c}
            className={
              'rounded-full px-3 py-1 text-xs border ' +
              (category === c
                ? 'bg-[var(--color-pine)] text-white border-[var(--color-pine)]'
                : 'border-[var(--color-border)] text-[var(--color-muted)] bg-[var(--color-surface)]')
            }
          >
            {CATEGORY_EMOJI[c]} {CATEGORY_LABELS[c]}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="flex-1 min-w-0 rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm"
        />
        <input
          type="time"
          value={time}
          onChange={(e) => setTime(e.target.value)}
          placeholder="optional"
          className="flex-1 min-w-0 rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm"
        />
      </div>
      <input
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        placeholder='e.g. "Hadestown 18:45 showing"'
        className="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm"
      />
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Notes (optional) — confirmation #, address, etc."
        rows={3}
        className="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm"
      />
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => onSave({ date, time, category, label, notes })}
          disabled={!label.trim()}
          className="flex-1 rounded-lg bg-[var(--color-pine)] text-white px-3 py-2 text-sm disabled:opacity-50"
        >
          Save
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
