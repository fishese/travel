import { useSavedFlights } from '../lib/flights'
import { useSavedHotels } from '../lib/hotels'
import { useSavedBookings } from '../lib/bookings'
import { buildReminders, useDismissedReminders, type ReminderItem } from '../lib/reminders'

function ReminderRow({ item, onDismiss }: { item: ReminderItem; onDismiss: () => void }) {
  return (
    <div className="flex items-center justify-between gap-2 py-1">
      <div className="flex items-center gap-2 min-w-0">
        <span aria-hidden>{item.emoji}</span>
        <div className="min-w-0">
          <p className="text-sm truncate">
            {item.time && <span className="tabular text-[var(--color-muted)]">{item.time} </span>}
            {item.title}
          </p>
          {item.subtitle && <p className="text-xs text-[var(--color-muted)] truncate">{item.subtitle}</p>}
        </div>
      </div>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss"
        className="text-xs text-[var(--color-muted)] shrink-0 w-6 h-6 flex items-center justify-center"
      >
        ✕
      </button>
    </div>
  )
}

export function ReminderFeed() {
  const [flights] = useSavedFlights()
  const [hotels] = useSavedHotels()
  const [bookings] = useSavedBookings()
  const { isDismissed, dismiss } = useDismissedReminders()

  const { today, tomorrow } = buildReminders(flights, hotels, bookings)
  const visibleToday = today.filter((i) => !isDismissed(i.id))
  const visibleTomorrow = tomorrow.filter((i) => !isDismissed(i.id))

  if (visibleToday.length === 0 && visibleTomorrow.length === 0) return null

  return (
    // Sticky against the viewport, not just its own scroll area — stays
    // visible as weather/country content scrolls past underneath. The
    // negative margin + matching padding makes it full-bleed behind the
    // page's own left/right padding, so a solid backdrop can sit behind
    // the (semi-transparent) amber card without a gap at the edges.
    <div className="sticky top-0 z-20 -mx-3 px-3 pt-3 pb-2 bg-[var(--color-paper)]">
      <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-amber-dim)] p-3">
        {visibleToday.length > 0 && (
          <div className={visibleTomorrow.length > 0 ? 'mb-2' : ''}>
            <h2 className="text-xs font-semibold text-[var(--color-muted)] mb-1">Today</h2>
            {visibleToday.map((item) => (
              <ReminderRow key={item.id} item={item} onDismiss={() => dismiss(item.id)} />
            ))}
          </div>
        )}
        {visibleTomorrow.length > 0 && (
          <div>
            <h2 className="text-xs font-semibold text-[var(--color-muted)] mb-1">Tomorrow</h2>
            {visibleTomorrow.map((item) => (
              <ReminderRow key={item.id} item={item} onDismiss={() => dismiss(item.id)} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
