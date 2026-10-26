import { addDays } from './dates'
import { validDate } from './validation'

export function hotelDateDefaults<T extends { checkIn?: string; checkOut?: string }>(row: T): T {
  return { ...row, checkOut: row.checkOut || (row.checkIn && validDate(row.checkIn) ? addDays(row.checkIn, 1) : row.checkOut) }
}

export function trainDateDefaults<T extends { category?: string; date?: string; arrivalDate?: string }>(row: T): T {
  return { ...row, arrivalDate: row.arrivalDate || (row.category === 'train' && row.date && validDate(row.date) ? row.date : row.arrivalDate) }
}
