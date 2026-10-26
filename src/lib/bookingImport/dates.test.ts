import { describe, expect, it } from 'vitest'
import { findAmbiguousDates, findDates, findTimes } from './dates'

const TODAY = '2026-01-15'

describe('findDates', () => {
  it('reads year-first numeric dates and Japanese era dates', () => {
    expect(findDates('2026/08/25', TODAY)[0]?.date).toBe('2026-08-25')
    expect(findDates('2026.08.25', TODAY)[0]?.date).toBe('2026-08-25')
    expect(findDates('令和8年8月25日', TODAY)[0]?.date).toBe('2026-08-25')
    expect(findDates('2026年8月25日', TODAY)[0]?.date).toBe('2026-08-25')
  })

  it('does not guess an ambiguous slash date', () => {
    expect(findDates('08/09/2026', TODAY)).toEqual([])
    expect(findAmbiguousDates('08/09/2026')).toEqual(['08/09/2026'])
    expect(findDates('25/08/2026', TODAY)[0]?.date).toBe('2026-08-25')
  })

  it('reads English month names in either order', () => {
    expect(findDates('25 Aug 2026', TODAY)[0]?.date).toBe('2026-08-25')
    expect(findDates('August 25, 2026', TODAY)[0]?.date).toBe('2026-08-25')
  })
})

describe('findTimes', () => {
  it('reads 24-hour, AM/PM, and Japanese times', () => {
    expect(findTimes('08:45')[0]?.time).toBe('08:45')
    expect(findTimes('7:45 PM')[0]?.time).toBe('19:45')
    expect(findTimes('午前9時30分')[0]?.time).toBe('09:30')
    expect(findTimes('2026.08.25')).toEqual([])
  })
})


describe('PDF spacing', () => {
  it('keeps year-first dates intact across extracted whitespace', () => {
    expect(findDates('2031 / 2 / 18')[0]?.date).toBe('2031-02-18')
    expect(findDates('2032 - 2 - 29')[0]?.date).toBe('2032-02-29')
    expect(findDates('2031 /\n02 / 18')[0]?.date).toBe('2031-02-18')
    expect(findDates('2031 / 2 / 29')).toEqual([])
  })
})
