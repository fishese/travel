import type { BookingFieldInput } from '../lib/bookings'

export type TrainDetails = Pick<BookingFieldInput, 'operator' | 'serviceNumber' | 'origin' | 'destination' | 'arrivalDate' | 'arrivalTime' | 'coach' | 'seat'>

export function TrainFields({ value, onChange }: { value: TrainDetails; onChange: (next: TrainDetails) => void }) {
  const fields = [
    ['operator', 'Train operator', 'text'], ['serviceNumber', 'Train service number', 'text'],
    ['origin', 'From station', 'text'], ['destination', 'To station', 'text'],
    ['arrivalDate', 'Train arrival date', 'date'], ['arrivalTime', 'Train arrival time', 'time'],
    ['coach', 'Coach', 'text'], ['seat', 'Seat', 'text'],
  ] as const
  return <fieldset className="grid grid-cols-2 gap-2 min-w-0">
    <legend className="text-xs font-semibold mb-1">Train journey</legend>
    {fields.map(([key, label, type]) => <label key={key} className="min-w-0 text-xs">
      {label}
      <input type={type} aria-label={label} value={value[key] ?? ''}
        onChange={(event) => onChange({ ...value, [key]: event.target.value })}
        className="block w-full min-w-0 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1.5 text-sm" />
    </label>)}
  </fieldset>
}
