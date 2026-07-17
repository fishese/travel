import { localDateStr } from './dateUtils'

/**
 * True if the given YYYY-MM-DD date string is strictly before today
 * (local time). Used to sort past trip records into a collapsed "Past"
 * group rather than deleting them or leaving them cluttering the top of
 * the list forever. A record with no date is never considered past.
 */
export function isPastDate(date: string | undefined, today: string = localDateStr()): boolean {
  if (!date) return false
  return date < today
}
