import { useSavedFlights } from '../lib/flights'
import { useSavedHotels } from '../lib/hotels'
import { useSavedBookings } from '../lib/bookings'
import { buildReminders, useDismissedReminders } from '../lib/reminders'
import { useActiveTab } from '../lib/tabs'

/**
 * Reads the weather cache directly rather than through a reactive hook —
 * weather.ts's caching isn't wired through the shared useSetting store, so
 * this is a pragmatic "good enough for a glance" read rather than a live
 * value. It won't update while you're sitting on another tab; it reflects
 * whatever was last fetched when you were last on the Dashboard tab. Worth
 * revisiting if that staleness ever actually matters in practice.
 */
function readWeatherGlance(): string | null {
  try {
    const raw = localStorage.getItem('travel_weather_cache_v1')
    if (!raw) return null
    const cache = JSON.parse(raw)
    const high = cache?.daily?.temperature_2m_max?.[0]
    return typeof high === 'number' ? `${Math.round(high)}°` : null
  } catch {
    return null
  }
}

export function FloatingShortcut() {
  const [activeTab, setActiveTab] = useActiveTab()
  const [flights] = useSavedFlights()
  const [hotels] = useSavedHotels()
  const [bookings] = useSavedBookings()
  const { isDismissed } = useDismissedReminders()

  if (activeTab === 'dashboard') return null // already looking at it

  const { today, tomorrow } = buildReminders(flights, hotels, bookings)
  const reminderCount = [...today, ...tomorrow].filter((i) => !isDismissed(i.id)).length
  const weatherGlance = readWeatherGlance()

  if (reminderCount === 0 && !weatherGlance) return null // nothing worth surfacing

  return (
    <button
      type="button"
      onClick={() => setActiveTab('dashboard')}
      aria-label="Back to dashboard"
      className="fixed bottom-20 right-3 z-40 rounded-full bg-[var(--color-pine)] text-white text-xs px-3 py-2 shadow-lg flex items-center gap-1.5"
    >
      {weatherGlance && <span className="tabular">{weatherGlance}</span>}
      {reminderCount > 0 && <span>🔔 {reminderCount}</span>}
    </button>
  )
}
