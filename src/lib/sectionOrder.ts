import { useSetting } from './useSetting'

export const DEFAULT_SECTION_ORDER = ['import-booking', 'flights', 'hotels', 'bookings', 'dive-certs', 'documents', 'protected-vault', 'itinerary']

/**
 * Inserts section ids added in a later version at their default position.
 * A person who put hotels above flights keeps that swap; Import booking
 * still appears first because that is where it sits in the default list.
 */
export function mergeSectionOrder(stored: string[], defaults: string[] = DEFAULT_SECTION_ORDER): string[] {
  const known = new Set(defaults)
  const result = stored.filter((id) => known.has(id))
  for (const id of defaults) {
    if (result.includes(id)) continue
    const defaultIndex = defaults.indexOf(id)
    let insertAt = result.length
    for (let i = 0; i < result.length; i++) {
      if (defaults.indexOf(result[i]) > defaultIndex) {
        insertAt = i
        break
      }
    }
    result.splice(insertAt, 0, id)
  }
  return result
}

/**
 * Persisted section order with up/down moves. Self-healing: if a future
 * update adds a new section id that isn't in someone's already-saved order
 * (or, in principle, if a saved id no longer exists), the effective order
 * quietly folds in the difference rather than the section just vanishing
 * or a stale id lingering forever.
 */
export function useSectionOrder() {
  const [stored, setStored] = useSetting<string[]>('travel_section_order', DEFAULT_SECTION_ORDER)

  const order = mergeSectionOrder(stored)

  function move(id: string, direction: -1 | 1) {
    const idx = order.indexOf(id)
    const newIdx = idx + direction
    if (idx === -1 || newIdx < 0 || newIdx >= order.length) return
    const next = [...order]
    ;[next[idx], next[newIdx]] = [next[newIdx], next[idx]]
    setStored(next)
  }

  return {
    order,
    moveUp: (id: string) => move(id, -1),
    moveDown: (id: string) => move(id, 1),
  }
}
