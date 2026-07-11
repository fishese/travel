export interface TipResult {
  tipAmount: number
  total: number
  perPerson: number
}

export function computeTip(bill: number, tipPercent: number, splitCount: number): TipResult {
  const tipAmount = bill * (tipPercent / 100)
  const total = bill + tipAmount
  const safeSplit = Math.max(1, splitCount || 1)
  return { tipAmount, total, perPerson: total / safeSplit }
}

export type TaxMode = 'add' | 'extract'

export interface TaxResult {
  preTax: number
  taxAmount: number
  total: number
}

export function computeSalesTax(amount: number, ratePercent: number, mode: TaxMode): TaxResult {
  const rate = ratePercent / 100
  if (mode === 'add') {
    const preTax = amount
    const taxAmount = amount * rate
    return { preTax, taxAmount, total: preTax + taxAmount }
  }
  // extract: `amount` is the tax-included total; back out the pre-tax portion
  const preTax = amount / (1 + rate)
  const taxAmount = amount - preTax
  return { preTax, taxAmount, total: amount }
}
