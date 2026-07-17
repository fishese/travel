import { useEffect, useRef, useState, type ReactNode } from 'react'
import { hapticTick } from '../lib/haptics'

const TRIGGER_DISTANCE = 64 // px of pull before releasing triggers a refresh
const MAX_PULL = 96 // px — resistance cap so the indicator can't be dragged forever
const RESISTANCE = 0.5 // indicator moves slower than the finger, standard pull-to-refresh feel

interface Props {
  onRefresh: () => Promise<void>
  children: ReactNode
}

/**
 * Wraps a scrollable page section with a native-feeling pull-to-refresh
 * gesture. Only engages when the page is already scrolled to the very
 * top — otherwise a downward drag is just normal scrolling and is left
 * alone. All mutable drag state lives in refs so the touch listeners are
 * attached once on mount rather than being torn down and rebuilt on every
 * pixel of movement.
 */
export function PullToRefresh({ onRefresh, children }: Props) {
  const [pull, setPull] = useState(0)
  const [refreshing, setRefreshing] = useState(false)

  const containerRef = useRef<HTMLDivElement>(null)
  const pullRef = useRef(0)
  const armedRef = useRef(false)
  const refreshingRef = useRef(false)
  const startRef = useRef<{ y: number } | null>(null)
  const onRefreshRef = useRef(onRefresh)

  useEffect(() => {
    onRefreshRef.current = onRefresh
  }, [onRefresh])

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    function setPullValue(v: number) {
      pullRef.current = v
      setPull(v)
    }

    function onTouchStart(e: TouchEvent) {
      if (window.scrollY > 0 || refreshingRef.current) {
        startRef.current = null
        return
      }
      startRef.current = { y: e.touches[0].clientY }
      armedRef.current = false
    }

    function onTouchMove(e: TouchEvent) {
      if (!startRef.current) return
      const delta = e.touches[0].clientY - startRef.current.y
      if (delta <= 0) {
        setPullValue(0)
        return
      }
      // Once actually pulling, take over from native overscroll so the
      // indicator tracks the finger instead of both fighting each other.
      e.preventDefault()
      const next = Math.min(MAX_PULL, delta * RESISTANCE)
      setPullValue(next)
      if (next >= TRIGGER_DISTANCE && !armedRef.current) {
        armedRef.current = true
        hapticTick()
      } else if (next < TRIGGER_DISTANCE) {
        armedRef.current = false
      }
    }

    async function onTouchEnd() {
      if (!startRef.current) return
      startRef.current = null
      if (pullRef.current < TRIGGER_DISTANCE) {
        setPullValue(0)
        return
      }
      refreshingRef.current = true
      setRefreshing(true)
      setPullValue(TRIGGER_DISTANCE)
      try {
        await onRefreshRef.current()
      } finally {
        refreshingRef.current = false
        setRefreshing(false)
        setPullValue(0)
      }
    }

    el.addEventListener('touchstart', onTouchStart, { passive: true })
    el.addEventListener('touchmove', onTouchMove, { passive: false })
    el.addEventListener('touchend', onTouchEnd)
    el.addEventListener('touchcancel', onTouchEnd)
    return () => {
      el.removeEventListener('touchstart', onTouchStart)
      el.removeEventListener('touchmove', onTouchMove)
      el.removeEventListener('touchend', onTouchEnd)
      el.removeEventListener('touchcancel', onTouchEnd)
    }
  }, [])

  return (
    <div ref={containerRef}>
      <div
        aria-hidden
        className="flex items-center justify-center overflow-hidden text-[var(--color-pine)]"
        style={{
          height: pull,
          transition: pull === 0 || refreshing ? 'height 150ms ease' : 'none',
        }}
      >
        <span
          className={refreshing ? 'inline-block animate-spin' : 'inline-block'}
          style={{ opacity: Math.min(1, pull / TRIGGER_DISTANCE) }}
        >
          🔄
        </span>
      </div>
      {children}
    </div>
  )
}
