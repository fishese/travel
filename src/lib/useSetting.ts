import { useCallback, useSyncExternalStore } from 'react'

// A localStorage-backed setting shared across every component that reads
// the same key — e.g. picking a country in <CountrySelector> must be seen
// immediately by <GratuityCalculator>, <SalesTaxCalculator>, and
// <Cheatsheet>, which each call useSetting('travel_current_country', ...)
// independently. A plain per-component useState can't do that (each
// instance is isolated); this uses a module-level store shared by every
// hook call for the same key, wired through useSyncExternalStore so React
// re-renders every subscriber when any one of them writes.
//
// Note: doesn't listen for the native `storage` event, so changes made in
// another browser tab won't sync live here — acceptable for a single-tab
// mobile PWA, worth revisiting if that usage pattern changes.

type Listener = () => void
const listeners = new Map<string, Set<Listener>>()
const store = new Map<string, unknown>()

function ensureLoaded<T>(key: string, defaultValue: T): T {
  if (store.has(key)) return store.get(key) as T
  const raw = localStorage.getItem(key)
  let value: T = defaultValue
  if (raw !== null) {
    try {
      value = JSON.parse(raw) as T
    } catch {
      // keep default
    }
  }
  store.set(key, value)
  return value
}

function notify(key: string) {
  listeners.get(key)?.forEach((l) => l())
}

export function useSetting<T>(key: string, defaultValue: T) {
  const subscribe = useCallback(
    (callback: Listener) => {
      let set = listeners.get(key)
      if (!set) {
        set = new Set()
        listeners.set(key, set)
      }
      set.add(callback)
      return () => set!.delete(callback)
    },
    [key],
  )

  // Safe to depend on defaultValue directly: every call site passes either
  // a primitive (stable by value) or a module-level constant (stable by
  // reference), never a fresh inline object/array literal.
  const getSnapshot = useCallback(() => ensureLoaded(key, defaultValue), [key, defaultValue])

  const value = useSyncExternalStore(subscribe, getSnapshot)

  const setValue = useCallback(
    (next: T | ((prev: T) => T)) => {
      const prev = ensureLoaded(key, defaultValue)
      const resolved = typeof next === 'function' ? (next as (prev: T) => T)(prev) : next
      store.set(key, resolved)
      localStorage.setItem(key, JSON.stringify(resolved))
      notify(key)
    },
    [key, defaultValue],
  )

  return [value, setValue] as const
}
