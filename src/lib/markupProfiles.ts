import { useSetting } from './useSetting'

export interface MarkupProfile {
  id: string
  label: string // "Cash", "HSBC Card", "Amex Platinum"...
  percent: number
}

const DEFAULT_PROFILES: MarkupProfile[] = [
  { id: 'cash', label: 'Cash', percent: 0 },
  { id: 'card-default', label: 'Card', percent: 3 },
]

function makeId() {
  return Math.random().toString(36).slice(2, 9)
}

export function useMarkupProfiles() {
  const [profiles, setProfiles] = useSetting<MarkupProfile[]>('travel_fx_profiles', DEFAULT_PROFILES)
  // Defaults to Cash (0%) rather than Card (3%) — this is the same rate
  // the mental math shortcut describes, so the hero result and the mental
  // math hint agree with each other by default. 3% is still one tap away.
  const [activeId, setActiveId] = useSetting('travel_fx_active_profile', DEFAULT_PROFILES[0].id)

  const active = profiles.find((p) => p.id === activeId) ?? profiles[0]

  function addProfile(label: string, percent: number) {
    const profile = { id: makeId(), label, percent }
    setProfiles((prev) => [...prev, profile])
    setActiveId(profile.id)
  }

  function updateProfile(id: string, patch: Partial<Pick<MarkupProfile, 'label' | 'percent'>>) {
    setProfiles((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)))
  }

  function removeProfile(id: string) {
    setProfiles((prev) => {
      const next = prev.filter((p) => p.id !== id)
      // never end up with zero profiles — fall back to the defaults
      return next.length > 0 ? next : DEFAULT_PROFILES
    })
    if (activeId === id) {
      const remaining = profiles.filter((p) => p.id !== id)
      setActiveId(remaining[0]?.id ?? DEFAULT_PROFILES[0].id)
    }
  }

  return {
    profiles,
    active,
    activeId,
    setActiveId,
    addProfile,
    updateProfile,
    removeProfile,
  }
}
