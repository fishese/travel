// Thin wrapper around the Vibration API. Guarded because it's
// unavailable on iOS Safari and desktop browsers entirely — this should
// enhance the tap-to-arm/swipe-delete pattern, never be required for it
// to work.

function vibrate(pattern: number | number[]) {
  if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
    navigator.vibrate(pattern)
  }
}

/** A quick, light tick — for arming a confirm state or crossing a
 * pull-to-refresh threshold. Not for the destructive action itself. */
export function hapticTick() {
  vibrate(10)
}

/** A slightly more definite double-pulse — for the actual destructive
 * action firing (delete confirmed, notes cleared, etc.). */
export function hapticConfirm() {
  vibrate([10, 30, 10])
}
