import { useEffect } from 'react'
import { useSetting } from './useSetting'

export type TabId = 'dashboard' | 'money' | 'planner' | 'cheatsheet'

export const TABS: { id: TabId; label: string; icon: string }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: '🏠' },
  { id: 'money', label: 'Money', icon: '💱' },
  { id: 'planner', label: 'Planner', icon: '🧳' },
  { id: 'cheatsheet', label: 'Cheatsheet', icon: '📋' },
]

const TAB_IDS = new Set<string>(TABS.map((t) => t.id))

export function useActiveTab() {
  const [tab, setTab] = useSetting<TabId>('travel_active_tab', 'dashboard')

  // A PWA home-screen shortcut (vite.config.ts's manifest `shortcuts`)
  // launches with e.g. `?tab=money` — honor it once on load, then strip
  // it from the URL. Without the strip, reloading or re-sharing that same
  // URL later would keep forcing that tab over whatever's actually
  // persisted. Empty deps is deliberate: this is a one-time "did we
  // launch from a shortcut" check, not something that should react to
  // subsequent tab changes.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const requested = params.get('tab')
    if (requested && TAB_IDS.has(requested)) {
      setTab(requested as TabId)
      params.delete('tab')
      const rest = params.toString()
      window.history.replaceState(null, '', window.location.pathname + (rest ? `?${rest}` : ''))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return [tab, setTab] as const
}
