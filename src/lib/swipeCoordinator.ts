// Tracks which SwipeToDelete row (if any) is currently revealed, so
// opening one swipe action closes any other that was left open — without
// this, swiping two rows open at once leaves two action zones exposed,
// and it's easy to fat-finger the wrong one. Same in-memory pub-sub shape
// as lib/currentCountry.ts's session-only override, just for a different
// piece of shared UI state.

export type SwipeSide = 'delete' | 'trip'

type Listener = () => void
const listeners = new Set<Listener>()
let openId: string | null = null
let openSide: SwipeSide = 'delete'

function notify() {
  listeners.forEach((l) => l())
}

export function requestOpen(id: string, side: SwipeSide = 'delete') {
  openId = id
  openSide = side
  notify()
}

export function closeAll() {
  if (openId === null) return
  openId = null
  openSide = 'delete'
  notify()
}

export function subscribeSwipe(callback: Listener) {
  listeners.add(callback)
  return () => listeners.delete(callback)
}

export function getOpenSwipeId() {
  return openId
}

export function getOpenSwipeSide(): SwipeSide {
  return openSide
}
