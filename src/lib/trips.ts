import { useCallback } from 'react'
import { useSetting } from './useSetting'

export interface Trip {
  id: string
  name: string
  destination?: string
  startDate?: string
  endDate?: string
  notes?: string
  createdAt: string
}

const EMPTY_TRIPS: Trip[] = []

export function useSavedTrips() {
  return useSetting<Trip[]>('travel_trips', EMPTY_TRIPS)
}

/** Sentinel stored in travel_active_trip — show every record, assigned or not. */
export const ALL_TRIPS_FILTER = 'all'

export function isConcreteTripId(id: string): boolean {
  return Boolean(id) && id !== ALL_TRIPS_FILTER
}

/** New records inherit the selected trip, but not the All/Unassigned filters. */
export function tripIdForNewRecord(activeTripId: string): string | undefined {
  return isConcreteTripId(activeTripId) ? activeTripId : undefined
}

export function useActiveTrip() {
  const [activeTripId, setActiveTripId] = useSetting('travel_active_trip', ALL_TRIPS_FILTER)
  const [trips] = useSavedTrips()
  const activeTrip = trips.find((trip) => trip.id === activeTripId) ?? null

  const selectTrip = useCallback((id: string) => setActiveTripId(id), [setActiveTripId])
  return { activeTripId, activeTrip, selectTrip }
}

export function newTrip(fields: Pick<Trip, 'name' | 'destination' | 'startDate' | 'endDate' | 'notes'>): Trip {
  return {
    id: crypto.randomUUID?.() ?? Math.random().toString(36).slice(2, 9),
    name: fields.name.trim(),
    destination: fields.destination?.trim() || undefined,
    startDate: fields.startDate || undefined,
    endDate: fields.endDate || undefined,
    notes: fields.notes?.trim() || undefined,
    createdAt: new Date().toISOString(),
  }
}

export function tripMatches(item: { tripId?: string }, activeTripId: string): boolean {
  if (activeTripId === ALL_TRIPS_FILTER) return true
  return activeTripId ? item.tripId === activeTripId : !item.tripId
}

export function tripDateLabel(trip: Trip): string {
  if (trip.startDate && trip.endDate) return `${trip.startDate} → ${trip.endDate}`
  return trip.startDate ?? trip.endDate ?? ''
}

