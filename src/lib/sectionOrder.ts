import { useSetting } from './useSetting'

export const DEFAULT_SECTION_ORDER = ['flights', 'hotels', 'bookings', 'dive-certs', 'documents', 'cheatsheet']

/**
 * Persisted section order with up/down moves. Self-healing: if a future
 * update adds a new section id that isn't in someone's already-saved order
 * (or, in principle, if a saved id no longer exists), the effective order
 * quietly folds in the difference rather than the section just vanishing
 * or a stale id lingering forever.
 */
export function useSectionOrder() {
  const [stored, setStored] = useSetting<string[]>('travel_section_order', DEFAULT_SECTION_ORDER)

  const order = [
    ...stored.filter((id) => DEFAULT_SECTION_ORDER.includes(id)),
    ...DEFAULT_SECTION_ORDER.filter((id) => !stored.includes(id)),
  ]

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
