import { describe, expect, it } from 'vitest'
import { DEFAULT_SECTION_ORDER, mergeSectionOrder } from './sectionOrder'

const PREVIOUS = ['flights', 'hotels', 'bookings', 'dive-certs', 'documents', 'protected-vault', 'itinerary']

describe('mergeSectionOrder', () => {
  it('inserts import booking at the front of a saved older order', () => {
    expect(mergeSectionOrder(PREVIOUS)).toEqual(['import-booking', ...PREVIOUS])
  })

  it('keeps a custom swap and still puts new sections in their default slot', () => {
    const merged = mergeSectionOrder(['hotels', 'flights'])
    expect(merged.slice(0, 3)).toEqual(['import-booking', 'hotels', 'flights'])
    expect(merged.slice(3)).toEqual(DEFAULT_SECTION_ORDER.filter((id) => !['import-booking', 'hotels', 'flights'].includes(id)))
  })

  it('drops a section id that no longer exists', () => {
    expect(mergeSectionOrder(['retired', 'flights'])).not.toContain('retired')
  })
})
