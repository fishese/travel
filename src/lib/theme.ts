import { useEffect } from 'react'
import { useSetting } from './useSetting'

export type ThemePreference = 'system' | 'light' | 'dark'

function getSystemScheme(): 'light' | 'dark' {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function applyTheme(effective: 'light' | 'dark') {
  document.documentElement.classList.toggle('dark', effective === 'dark')
}

/**
 * Applies the dark/light class to <html> and keeps it in sync — with the
 * OS theme while `preference` is 'system' (including live updates if the
 * OS theme changes while the app is open), or with the explicit choice
 * once the person has toggled it at least once.
 */
export function useThemeController() {
  const [preference, setPreference] = useSetting<ThemePreference>('travel_theme', 'system')
  const effective = preference === 'system' ? getSystemScheme() : preference

  useEffect(() => {
    applyTheme(preference === 'system' ? getSystemScheme() : preference)

    if (preference !== 'system') return
    const mql = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => applyTheme(getSystemScheme())
    mql.addEventListener('change', onChange)
    return () => mql.removeEventListener('change', onChange)
  }, [preference])

  function toggle() {
    setPreference(effective === 'dark' ? 'light' : 'dark')
  }

  return { preference, effective, toggle }
}
