import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from 'react'
import { requestOpen, closeAll, subscribeSwipe, getOpenSwipeId } from '../lib/swipeCoordinator'
import { hapticTick, hapticConfirm } from '../lib/haptics'

const REVEAL_WIDTH = 88 // px — width of the red delete zone once swiped open
const OPEN_THRESHOLD = REVEAL_WIDTH / 2 // drag past halfway to snap open on release
const DRAG_SLOP = 8 // px of initial movement before we commit to horizontal vs. let vertical scroll win
const CONFIRM_ARM_MS = 3000 // matches ShoppingNotes' tap-to-arm window, for consistency

interface Props {
  /** Unique per row — used both as the React-independent swipe coordinator
   * key and the confirm-state key (see FlightCard etc. for how "Remove"
   * text links reuse the same id to open this without a gesture). */
  id: string
  /** Short human label for the row, read by screen readers on the delete
   * button instead of a bare "Delete" ("Delete CX500" vs "Delete"). */
  label: string
  onDelete: () => void | Promise<void>
  children: ReactNode
}

/**
 * Swipe left to reveal a delete action; tapping it arms a confirm state
 * (same tap-to-arm pattern as ShoppingNotes' Clear and Flights' Reset
 * count) rather than deleting on the first tap — the swipe alone never
 * deletes anything. Only one row can be open at a time across the whole
 * app (see lib/swipeCoordinator.ts); opening a new one, or tapping
 * anywhere outside, closes whatever was open before.
 */
export function SwipeToDelete({ id, label, onDelete, children }: Props) {
  const openId = useSyncExternalStore(subscribeSwipe, getOpenSwipeId)
  const isOpen = openId === id

  const [dragX, setDragX] = useState(0)
  const [dragging, setDragging] = useState(false)
  const [armed, setArmed] = useState(false)

  const containerRef = useRef<HTMLDivElement>(null)
  const startRef = useRef<{ x: number; y: number; wasOpen: boolean } | null>(null)
  const axisRef = useRef<'undecided' | 'horizontal' | 'vertical'>('undecided')
  const armTimerRef = useRef<number | null>(null)

  // Follow the shared coordinator: closing here just means snapping this
  // row's own visual state back, not touching global state again (that
  // would loop).
  useEffect(() => {
    if (!isOpen) {
      setDragX(0)
      setArmed(false)
      if (armTimerRef.current) window.clearTimeout(armTimerRef.current)
    } else {
      setDragX(-REVEAL_WIDTH)
    }
  }, [isOpen])

  // Tapping outside an open row closes it — same expectation as any other
  // swipe-actions list (Mail, etc.).
  useEffect(() => {
    if (!isOpen) return
    function handleOutside(e: PointerEvent) {
      if (!containerRef.current?.contains(e.target as Node)) closeAll()
    }
    document.addEventListener('pointerdown', handleOutside)
    return () => document.removeEventListener('pointerdown', handleOutside)
  }, [isOpen])

  function onPointerDown(e: React.PointerEvent) {
    if (!e.isPrimary) return
    startRef.current = { x: e.clientX, y: e.clientY, wasOpen: isOpen }
    axisRef.current = 'undecided'
    setDragging(true)
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!dragging || !startRef.current) return
    const dx = e.clientX - startRef.current.x
    const dy = e.clientY - startRef.current.y

    if (axisRef.current === 'undecided') {
      if (Math.abs(dx) < DRAG_SLOP && Math.abs(dy) < DRAG_SLOP) return
      axisRef.current = Math.abs(dx) > Math.abs(dy) ? 'horizontal' : 'vertical'
      if (axisRef.current === 'horizontal') {
        e.currentTarget.setPointerCapture(e.pointerId)
      } else {
        // A vertical scroll won — stop tracking this gesture as a swipe.
        setDragging(false)
        return
      }
    }
    if (axisRef.current !== 'horizontal') return

    const base = startRef.current.wasOpen ? -REVEAL_WIDTH : 0
    const next = Math.min(0, Math.max(-REVEAL_WIDTH, base + dx))
    setDragX(next)
  }

  function endDrag() {
    if (!dragging) return
    setDragging(false)
    if (axisRef.current !== 'horizontal') return
    if (dragX <= -OPEN_THRESHOLD) {
      setDragX(-REVEAL_WIDTH)
      requestOpen(id)
    } else {
      setDragX(0)
      if (isOpen) closeAll()
    }
  }

  function handleDeleteTap() {
    if (!armed) {
      setArmed(true)
      hapticTick()
      armTimerRef.current = window.setTimeout(() => setArmed(false), CONFIRM_ARM_MS)
      return
    }
    if (armTimerRef.current) window.clearTimeout(armTimerRef.current)
    hapticConfirm()
    closeAll()
    void onDelete()
  }

  return (
    <div ref={containerRef} className="relative overflow-hidden rounded-lg">
      <div className="absolute inset-y-0 right-0 flex" style={{ width: REVEAL_WIDTH }}>
        <button
          type="button"
          onClick={handleDeleteTap}
          aria-label={armed ? `Confirm delete ${label}` : `Delete ${label}`}
          className={
            'flex-1 flex items-center justify-center text-xs font-medium text-white transition-colors ' +
            (armed ? 'bg-[var(--color-danger)]' : 'bg-[var(--color-danger)] opacity-80')
          }
        >
          {armed ? 'Confirm?' : 'Delete'}
        </button>
      </div>
      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        style={{
          transform: `translateX(${dragX}px)`,
          transition: dragging ? 'none' : 'transform 150ms ease',
          touchAction: 'pan-y',
        }}
        className="relative bg-[var(--color-surface)]"
      >
        {children}
      </div>
    </div>
  )
}
