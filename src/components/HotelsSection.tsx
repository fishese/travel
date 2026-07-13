import { useState } from 'react'
import { useSavedHotels, newHotel, lookupHotel, type HotelLookupResult } from '../lib/hotels'
import { Collapsible } from './Collapsible'
import { ShowToDriver } from './ShowToDriver'

interface Props {
  onMoveUp?: () => void
  onMoveDown?: () => void
}

export function HotelsSection({ onMoveUp, onMoveDown }: Props) {
  const [hotels, setHotels] = useSavedHotels()

  const [name, setName] = useState('')
  const [city, setCity] = useState('')
  const [address, setAddress] = useState('')
  const [phone, setPhone] = useState('')
  const [checkIn, setCheckIn] = useState('')
  const [checkOut, setCheckOut] = useState('')
  const [notes, setNotes] = useState('')
  const [osmPlaceId, setOsmPlaceId] = useState<string | undefined>(undefined)
  const [lat, setLat] = useState<number | undefined>(undefined)
  const [lon, setLon] = useState<number | undefined>(undefined)

  const [looking, setLooking] = useState(false)
  const [lookupError, setLookupError] = useState<string | null>(null)
  const [results, setResults] = useState<HotelLookupResult[]>([])

  const [driverView, setDriverView] = useState<{ name: string; address: string; mapsUrl?: string } | null>(null)

  async function handleLookup() {
    setLooking(true)
    setLookupError(null)
    try {
      setResults(await lookupHotel(name, city))
    } catch (e) {
      setLookupError((e as Error).message)
    } finally {
      setLooking(false)
    }
  }

  function applyResult(r: HotelLookupResult) {
    setAddress(r.address)
    setLat(r.lat)
    setLon(r.lon)
    setOsmPlaceId(r.osmPlaceId)
    if (r.phone) setPhone(r.phone)
    setResults([])
  }

  function addHotel() {
    if (!name.trim()) return
    setHotels((prev) => [
      ...prev,
      newHotel({ name, city, address, phone, checkIn, checkOut, notes, lat, lon, osmPlaceId }),
    ])
    setName('')
    setCity('')
    setAddress('')
    setPhone('')
    setCheckIn('')
    setCheckOut('')
    setNotes('')
    setLat(undefined)
    setLon(undefined)
    setOsmPlaceId(undefined)
    setResults([])
  }

  function removeHotel(id: string) {
    setHotels((prev) => prev.filter((h) => h.id !== id))
  }

  const sorted = [...hotels].sort((a, b) => (a.checkIn ?? '9999').localeCompare(b.checkIn ?? '9999'))

  return (
    <Collapsible id="hotels" title="Hotels" onMoveUp={onMoveUp} onMoveDown={onMoveDown}>
      <div className="space-y-2 mb-2 pb-2 border-b border-dashed border-[var(--color-border)]">
        <div className="flex gap-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Hotel name"
            className="flex-1 rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm"
          />
          <input
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="City"
            className="flex-1 rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm"
          />
        </div>

        <button
          type="button"
          onClick={handleLookup}
          disabled={looking || !name.trim()}
          className="text-xs text-[var(--color-pine)] underline disabled:opacity-40"
        >
          {looking ? 'Looking up…' : 'Look up address on the map'}
        </button>
        {lookupError && <p className="text-xs text-[var(--color-amber)]">{lookupError}</p>}
        {results.length > 0 && (
          <ul className="rounded-lg border border-[var(--color-border)] divide-y divide-[var(--color-border)]">
            {results.map((r) => (
              <li key={r.osmPlaceId}>
                <button
                  type="button"
                  onClick={() => applyResult(r)}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-[var(--color-amber-dim)]"
                >
                  {r.label}
                </button>
              </li>
            ))}
          </ul>
        )}

        <input
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="Address"
          className="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm"
        />
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="Phone (optional)"
          className="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm"
        />

        <div className="flex gap-2">
          <label className="flex-1">
            <span className="block text-xs text-[var(--color-muted)] mb-0.5">Check-in</span>
            <input
              type="date"
              value={checkIn}
              onChange={(e) => setCheckIn(e.target.value)}
              className="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm"
            />
          </label>
          <label className="flex-1">
            <span className="block text-xs text-[var(--color-muted)] mb-0.5">Check-out</span>
            <input
              type="date"
              value={checkOut}
              onChange={(e) => setCheckOut(e.target.value)}
              className="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm"
            />
          </label>
        </div>

        <input
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Notes — room #, WiFi, how to get there…"
          className="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm"
        />

        <button
          type="button"
          onClick={addHotel}
          disabled={!name.trim()}
          className="w-full rounded-lg bg-[var(--color-pine)] text-white px-3 py-2 text-sm disabled:opacity-50"
        >
          Save hotel
        </button>
      </div>

      {sorted.length === 0 ? (
        <p className="text-sm text-[var(--color-muted)]">No hotels saved yet.</p>
      ) : (
        <div className="space-y-2">
          {sorted.map((h) => (
            <div key={h.id} className="rounded-lg border border-[var(--color-border)] p-2">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-semibold truncate">{h.name}</p>
                  <p className="text-xs text-[var(--color-muted)] truncate">
                    {[h.checkIn, h.checkOut].filter(Boolean).join(' → ') || h.city}
                  </p>
                  {h.address && <p className="text-xs text-[var(--color-muted)] truncate">{h.address}</p>}
                </div>
                <button
                  type="button"
                  onClick={() => removeHotel(h.id)}
                  className="text-xs text-[var(--color-amber)] shrink-0"
                >
                  Remove
                </button>
              </div>
              <div className="flex gap-3 mt-1 text-xs">
                {h.address && (
                  <button
                    type="button"
                    onClick={() => setDriverView({ name: h.name, address: h.address, mapsUrl: h.mapsUrl })}
                    className="text-[var(--color-pine)] underline"
                  >
                    Show to driver
                  </button>
                )}
                {h.mapsUrl && (
                  <a href={h.mapsUrl} target="_blank" rel="noreferrer" className="text-[var(--color-pine)] underline">
                    Open in Maps
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {driverView && (
        <ShowToDriver
          name={driverView.name}
          address={driverView.address}
          mapsUrl={driverView.mapsUrl}
          onClose={() => setDriverView(null)}
        />
      )}
    </Collapsible>
  )
}
