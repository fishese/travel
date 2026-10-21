import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import Ajv from 'ajv'
import { parseImportInput, parseImportJson } from './jsonFormat'
import { defaultDocumentStorage, importFileCategory } from './storage'

const schema = JSON.parse(readFileSync(new URL('../../../docs/import-format.schema.json', import.meta.url), 'utf8'))
const example = JSON.parse(readFileSync(new URL('../../../docs/examples/japan-trip.json', import.meta.url), 'utf8'))
const ajv = new Ajv({ allErrors: true, strict: false })
const validate = ajv.compile(schema)

describe('travel-toolkit-import', () => {
  it('accepts the documented example in both the schema and the app', () => {
    expect(validate(example)).toBe(true)
    const result = parseImportJson(JSON.stringify(example))
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.preview.flights[0]).toMatchObject({ flightIata: 'SQ638', origin: 'HKG', destination: 'NRT', date: '2026-08-25', departureTime: '08:45', arrivalTime: '14:10' })
    expect(result.preview.flights[0].notes).toContain('Jane Doe')
    expect(result.preview.flights[0].notes).toContain('Seat 14A')
    expect(result.preview.hotels[0]).toMatchObject({ name: 'Park Hyatt Tokyo', city: 'Tokyo', checkIn: '2026-08-25' })
    expect(result.preview.hotels[0].notes).toContain('JPY 186000')
    expect(result.preview.bookings[0]).toMatchObject({ category: 'train', date: '2026-08-25', time: '10:00' })
    expect(result.preview.suggestVault).toBe(false)
  })

  it('rejects a different format instead of guessing', () => {
    const result = parseImportInput('{ "format": "something-else", "version": 1 }')
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error).toMatch(/travel-toolkit-import/)
  })

  it('rejects an unsupported version', () => {
    const result = parseImportJson('{ "format": "travel-toolkit-import", "version": 2, "flights": [] }')
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error).toMatch(/version 1/)
  })

  it('removes a passport number from JSON notes and suggests the vault', () => {
    const result = parseImportJson(JSON.stringify({
      format: 'travel-toolkit-import',
      version: 1,
      flights: [{ flightNumber: 'SQ638', date: '2026-08-25', notes: 'Passport No: AB1234567' }],
    }))
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.preview.suggestVault).toBe(true)
    expect(result.preview.flights[0].notes).not.toContain('AB1234567')
    expect(result.preview.rawText).not.toContain('AB1234567')
    expect(defaultDocumentStorage(result.preview)).toBe('vault')
    expect(importFileCategory(result.preview, 'vault')).toBe('identity')
    expect(importFileCategory(result.preview, 'public')).toBe('booking')
  })

  it('keeps an ordinary flight file in the public booking area', () => {
    const result = parseImportJson(JSON.stringify(example))
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(defaultDocumentStorage(result.preview)).toBe('public')
    expect(importFileCategory(result.preview, 'public')).toBe('booking')
    expect(importFileCategory({ ...result.preview, hotels: [], bookings: [] }, 'vault')).toBe('flight')
  })
})
