import { useSetting } from './useSetting'

export function useCurrentCountry() {
  return useSetting('travel_current_country', '')
}
