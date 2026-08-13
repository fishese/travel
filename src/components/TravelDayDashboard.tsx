import { useEffect, useMemo, useState } from 'react'
import { useSavedFlights } from '../lib/flights'
import { useSavedHotels } from '../lib/hotels'
import { useSavedBookings } from '../lib/bookings'
import { useActiveTrip, tripMatches, tripDateLabel } from '../lib/trips'
import { formatFriendlyDate, localDateStr } from '../lib/dateUtils'

function minutesUntil(date: string, time?: string): number | null {
  if (!time) return null
  const target = new Date(`${date}T${time}:00`).getTime()
  if (!Number.isFinite(target)) return null
  return Math.round((target - Date.now()) / 60_000)
}

function countdown(minutes: number | null): string | null {
  if (minutes === null) return null
  if (minutes < 0) return 'started'
  const days = Math.floor(minutes / 1440)
  const hours = Math.floor((minutes % 1440) / 60)
  const mins = minutes % 60
  if (days) return `${days}d ${hours}h`
  if (hours) return `${hours}h ${mins}m`
  return `${mins}m`
}

export function TravelDayDashboard() {
  const [flights] = useSavedFlights()
  const [hotels] = useSavedHotels()
  const [bookings] = useSavedBookings()
  const { activeTrip } = useActiveTrip()
  const today = localDateStr()
  const [showBackToTop, setShowBackToTop] = useState(false)

  useEffect(() => {
    const update = () => {
      const scrollTop = Math.max(window.scrollY, document.scrollingElement?.scrollTop ?? 0, document.documentElement.scrollTop, document.body.scrollTop)
      setShowBackToTop(scrollTop > 160)
    }
    update()
    window.addEventListener('scroll', update, { passive: true })
    return () => window.removeEventListener('scroll', update)
  }, [])

  const scopedFlights = flights.filter((item) => tripMatches(item, activeTrip?.id ?? ''))
  const scopedHotels = hotels.filter((item) => tripMatches(item, activeTrip?.id ?? ''))
  const scopedBookings = bookings.filter((item) => tripMatches(item, activeTrip?.id ?? ''))

  const todayFlights = scopedFlights.filter((item) => item.date === today).sort((a, b) => (a.departureTime ?? '').localeCompare(b.departureTime ?? ''))
  const todayBookings = scopedBookings.filter((item) => item.date === today).sort((a, b) => (a.time ?? '').localeCompare(b.time ?? ''))
  const todayCheckIns = scopedHotels.filter((item) => item.checkIn === today)
  const todayCheckOuts = scopedHotels.filter((item) => item.checkOut === today)
  const nextFlight = useMemo(() => scopedFlights.filter((item) => item.date >= today).sort((a, b) => `${a.date}${a.departureTime ?? ''}`.localeCompare(`${b.date}${b.departureTime ?? ''}`))[0], [scopedFlights, today])
  const nextCountdown = nextFlight ? countdown(minutesUntil(nextFlight.date, nextFlight.departureTime)) : null

  if (!activeTrip) return null

  return (
    <>
      {showBackToTop && (
        <button
          type="button"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          aria-label="Back to top of dashboard"
          className="fixed bottom-20 right-3 z-30 rounded-full bg-[var(--color-pine)] text-white px-3 py-2 text-xs shadow-lg"
        >
          ↑ Dashboard top
        </button>
      )}
      <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3 mt-2">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold truncate">Today in {activeTrip.destination || activeTrip.name}</h2>
          <p className="text-xs text-[var(--color-muted)]">{formatFriendlyDate(today)}{tripDateLabel(activeTrip) ? ` · trip ${tripDateLabel(activeTrip)}` : ''}</p>
        </div>
        {nextFlight && <div className="text-right shrink-0"><p className="text-xs text-[var(--color-muted)]">Next flight</p><p className="font-semibold tabular">{nextFlight.flightIata}</p><p className="text-xs text-[var(--color-pine)]">{nextCountdown}</p></div>}
      </div>

      {todayFlights.length + todayBookings.length + todayCheckIns.length + todayCheckOuts.length === 0 ? (
        <p className="text-sm text-[var(--color-muted)] mt-2">No timed items saved for today. Check the Planner for the full trip.</p>
      ) : (
        <div className="mt-2 space-y-1">
          {todayFlights.map((flight) => <p key={flight.id} className="text-sm"><span aria-hidden>✈️</span> <span className="tabular">{flight.departureTime || '—'}</span> {flight.flightIata} · {flight.origin || '?'} → {flight.destination || '?'}</p>)}
          {todayCheckIns.map((hotel) => <p key={`in-${hotel.id}`} className="text-sm"><span aria-hidden>🏨</span> Check in · {hotel.name}</p>)}
          {todayCheckOuts.map((hotel) => <p key={`out-${hotel.id}`} className="text-sm"><span aria-hidden>🏨</span> Check out · {hotel.name}</p>)}
          {todayBookings.map((booking) => <p key={booking.id} className="text-sm"><span aria-hidden>{booking.category === 'restaurant' ? '🍽️' : '📌'}</span> <span className="tabular">{booking.time || '—'}</span> {booking.label}</p>)}
        </div>
      )}

      <div className="grid grid-cols-3 gap-2 mt-3 pt-2 border-t border-dashed border-[var(--color-border)] text-center">
        <div><p className="text-xs text-[var(--color-muted)]">Flights</p><p className="font-semibold tabular">{scopedFlights.length}</p></div>
        <div><p className="text-xs text-[var(--color-muted)]">Bookings</p><p className="font-semibold tabular">{scopedBookings.length}</p></div>
        <div><p className="text-xs text-[var(--color-muted)]">Hotels</p><p className="font-semibold tabular">{scopedHotels.length}</p></div>
      </div>
      </section>
    </>
  )
}
