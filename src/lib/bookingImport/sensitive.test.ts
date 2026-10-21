import { describe, expect, it } from 'vitest'
import { redactSensitive } from './sensitive'

describe('redactSensitive', () => {
  it('removes passport numbers, card numbers, and security codes', () => {
    const scanned = redactSensitive('Passport No: AB1234567\nCard number: 4111 1111 1111 1111\nCVV: 123\nFlight SQ 638\nPhone +81 3 5322 1234\nBooking reference ABC123')
    expect(scanned.findings).toEqual(expect.arrayContaining(['passport', 'payment-card', 'security-code']))
    expect(scanned.text).not.toContain('AB1234567')
    expect(scanned.text).not.toContain('4111')
    expect(scanned.text).not.toMatch(/CVV:\s*123/)
    expect(scanned.text).toContain('SQ 638')
    expect(scanned.text).toContain('+81 3 5322 1234')
    expect(scanned.text).toContain('ABC123')
  })

  it('leaves a confirmation that fails the Luhn check alone', () => {
    const scanned = redactSensitive('Confirmation: 1234567890')
    expect(scanned.text).toContain('1234567890')
    expect(scanned.findings).toEqual([])
  })
})
