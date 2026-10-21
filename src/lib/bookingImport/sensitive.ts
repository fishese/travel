export type SensitiveKind = 'passport' | 'payment-card' | 'security-code'

export interface SensitiveScan {
  text: string
  findings: SensitiveKind[]
}

function luhn(digits: string): boolean {
  let sum = 0
  let alt = false
  for (let i = digits.length - 1; i >= 0; i--) {
    let n = digits.charCodeAt(i) - 48
    if (n < 0 || n > 9) return false
    if (alt) {
      n *= 2
      if (n > 9) n -= 9
    }
    sum += n
    alt = !alt
  }
  return sum % 10 === 0
}

function add(findings: SensitiveKind[], kind: SensitiveKind) {
  if (!findings.includes(kind)) findings.push(kind)
}

/**
 * Removes passport numbers, card numbers, and card security codes from text
 * that will be stored with a booking. Booking references, flight numbers,
 * and phone numbers are left alone. Unlabeled card numbers are removed only
 * when they pass the Luhn check, which flight numbers and typical
 * confirmation codes do not.
 */
export function redactSensitive(input: string): SensitiveScan {
  const findings: SensitiveKind[] = []
  let text = input
  const passportNumbers: string[] = []

  text = text.replace(
    /(?:passport(?:\s*(?:no\.?|number|nr|#))?|旅券番号|パスポート番号)\s*[:：#]?\s*([A-Z0-9][A-Z0-9-]{5,14})/gi,
    (full, num: string) => {
      add(findings, 'passport')
      passportNumbers.push(num)
      return full.replace(num, '[passport number removed]')
    },
  )
  for (const num of passportNumbers) {
    if (num && text.includes(num)) {
      text = text.split(num).join('[passport number removed]')
    }
  }

  text = text.replace(
    /(?:credit\s*card(?:\s*number)?|card\s*number|カード番号|クレジットカード(?:番号)?)\s*[:：#]?\s*([0-9][0-9\s-]{11,22}[0-9])/gi,
    (full, num: string) => {
      add(findings, 'payment-card')
      return full.replace(num, '[card number removed]')
    },
  )

  text = text.replace(
    /(?:cvv|cvc|cid|security\s*code|セキュリティコード)\s*[:：#]?\s*(\d{3,4})\b/gi,
    (full, num: string) => {
      add(findings, 'security-code')
      return full.replace(num, '[security code removed]')
    },
  )

  text = text.replace(/(?<!\d)(?:\d[ -]?){13,19}(?!\d)/g, (match) => {
    const digits = match.replace(/\D/g, '')
    if (digits.length < 13 || digits.length > 19) return match
    if (!luhn(digits)) return match
    add(findings, 'payment-card')
    return '[card number removed]'
  })

  return { text, findings }
}
