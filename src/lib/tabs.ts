import { useSetting } from './useSetting'

export type TabId = 'dashboard' | 'money' | 'planner' | 'cheatsheet'

export const TABS: { id: TabId; label: string; icon: string }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: '🏠' },
  { id: 'money', label: 'Money', icon: '💱' },
  { id: 'planner', label: 'Planner', icon: '🧳' },
  { id: 'cheatsheet', label: 'Cheatsheet', icon: '📋' },
]

export function useActiveTab() {
  return useSetting<TabId>('travel_active_tab', 'dashboard')
}
