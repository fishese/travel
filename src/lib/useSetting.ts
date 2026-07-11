import { useState, useCallback } from 'react'

/** Generic localStorage-backed setting — keys match the Settings table in the design spec. */
export function useSetting<T>(key: string, defaultValue: T) {
  const [value, setValue] = useState<T>(() => {
    const raw = localStorage.getItem(key)
    if (raw === null) return defaultValue
    try {
      return JSON.parse(raw) as T
    } catch {
      return defaultValue
    }
  })

  const update = useCallback(
    (next: T | ((prev: T) => T)) => {
      setValue((prev) => {
        const resolved = typeof next === 'function' ? (next as (prev: T) => T)(prev) : next
        localStorage.setItem(key, JSON.stringify(resolved))
        return resolved
      })
    },
    [key],
  )

  return [value, update] as const
}
