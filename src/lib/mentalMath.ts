/**
 * Turns an exact exchange rate into a human-friendly mental-math shortcut
 * ("Divide by 4, minus a tiny bit" rather than "× 0.24375").
 *
 * Based on the six-rule algorithm in mental_math_algo.md, redesigned around
 * one shared "describe this mantissa" function rather than separate
 * bespoke logic per rule. Two real bugs turned up in the original while
 * validating against its own worked examples, both fixed here:
 *
 * 1. Redundant zero-shift: for a rate like 0.001, the original produced
 *    "Drop 4 zeros, then multiply by 10" — mathematically identical to just
 *    "Drop 3 zeros," since the friendly-number list has no "1" to snap to
 *    and so was forced into "10" when the true mantissa was already ~1.
 *    Fixed by explicitly detecting a mantissa near 1 before running the
 *    friendly-number search at all.
 *
 * 2. Suboptimal zero-count: for a rate like 24500 (USD→VND-scale), the
 *    original committed to a single "natural" zero-count and lived with
 *    whatever mantissa that produced (2.45, forced to a rough "×2", ~18%
 *    off) — even though shifting one zero the other way lands on an
 *    excellent fit (24.5 → 25, a friendly number already in the list, ~2%
 *    off). Fixed by trying both the natural zero-count and its neighbor,
 *    keeping whichever fits best, with a tie-break that resists floating
 *    point noise so boundary rates don't flip to an awkward double-zero
 *    phrasing for no real accuracy gain.
 *
 * Validated against every worked example in the source doc (matches
 * exactly or improves on them) plus boundary/degenerate inputs (exact
 * powers of ten, zero, negative, NaN, Infinity) before being wired in.
 */

export interface MentalMathResult {
  text: string
  errorPercent: number // 0 means "exact" or close enough not to mention
}

const FRIENDLY_NUMBERS = [2, 3, 4, 5, 6, 7, 8, 9, 10, 15, 20, 25, 30, 40, 50, 60, 70, 80, 90, 100]

function closestFriendly(value: number): number {
  return FRIENDLY_NUMBERS.reduce((best, cur) => (Math.abs(cur - value) < Math.abs(best - value) ? cur : best))
}

function rawError(estimate: number, actual: number): number {
  return actual === 0 ? 0 : Math.abs(estimate - actual) / actual
}

interface MantissaDescription {
  text: string
  err: number // raw fraction, e.g. 0.03 for 3%
}

/**
 * Describes a mantissa already in a "reasonable" range (roughly 0.01–100,
 * i.e. no huge zero-shift pending) as a friendly multiply / divide /
 * percentage move. This is the single shared core — used directly for
 * mid-range rates, and reused on whatever's left over after stripping
 * zeros for extreme rates — which is what prevents bug #1 above.
 */
function describeMantissa(m: number): MantissaDescription {
  // Close enough to 1 that no operation is worth stating.
  if (Math.abs(m - 1) < 0.04) {
    return { text: 'roughly equal', err: rawError(1, m) }
  }

  // 0.5–2.0: a percentage shift reads more naturally than a decimal
  // multiplier (e.g. "add 50%" beats "× 1.5").
  if (m >= 0.5 && m < 2.0) {
    const diff = m - 1
    let percent = Math.round(Math.abs(diff) * 100)
    percent = Math.round(percent / 5) * 5
    if (percent === 0) return { text: 'roughly equal', err: rawError(1, m) }

    const sign = diff > 0 ? 1 : -1
    const estimate = 1 + sign * (percent / 100)
    const err = rawError(estimate, m)
    const verb = sign > 0 ? 'Add' : 'Subtract'
    const fraction =
      percent === 25 ? ' (a quarter)' :
      percent === 50 ? ' (half)' :
      percent === 33 || percent === 35 ? ' (a third)' :
      percent === 65 || percent === 66 ? ' (two-thirds)' :
      percent === 75 ? ' (three-quarters)' : ''
    return { text: `${verb} ${percent}%${fraction}`, err }
  }

  // >= 2.0: direct multiplier.
  if (m >= 2.0) {
    const friendly = closestFriendly(m)
    const err = rawError(friendly, m)
    const diff = friendly - m
    const qualifier = Math.abs(diff) / m > 0.01 ? (diff < 0 ? ' and add a bit' : ' and subtract a bit') : ''
    if (friendly >= 10 && friendly % 10 === 0 && friendly <= 100) {
      const short =
        friendly === 10 ? 'Add a zero' : friendly === 100 ? 'Add two zeros' : `Multiply by ${friendly / 10}, add a zero`
      return { text: `${short}${qualifier}`, err }
    }
    return { text: `Multiply by ${friendly}${qualifier}`, err }
  }

  // < 0.5: direct divisor (invert, snap to friendly).
  const divisor = closestFriendly(1 / m)
  const estimate = 1 / divisor
  const err = rawError(estimate, m)
  const diff = estimate - m
  const qualifier = Math.abs(diff) / m > 0.01 ? (diff < 0 ? ' plus a tiny bit' : ' minus a tiny bit') : ''
  if (divisor >= 10 && divisor % 10 === 0 && divisor <= 100) {
    const short = divisor === 10 ? 'Drop a zero' : divisor === 100 ? 'Drop two zeros' : `Drop a zero, divide by ${divisor / 10}`
    return { text: `${short}${qualifier}`, err }
  }
  return { text: `Divide by ${divisor}${qualifier}`, err }
}

export function describeMentalMath(rate: number): MentalMathResult {
  if (!Number.isFinite(rate) || rate <= 0) {
    return { text: '', errorPercent: 0 }
  }
  if (Math.abs(rate - 1) < 0.005) {
    return { text: '1:1 — no math needed', errorPercent: 0 }
  }

  // Mid-range: describe directly, no zero-shifting needed.
  if (rate >= 0.01 && rate <= 100) {
    const { text, err } = describeMantissa(rate)
    return { text: text[0].toUpperCase() + text.slice(1), errorPercent: Math.round(err * 100) }
  }

  // Extreme ratios: strip zeros down to a manageable mantissa. Try both the
  // "natural" zero-count and its neighbor, keep whichever mantissa fits a
  // friendly number best (bug #2 fix) — with a tie-break so near-equal
  // fits don't flip to a worse-sounding phrasing over floating point noise.
  const dropping = rate < 0.01
  const zBase = Math.floor(Math.abs(Math.log10(rate)))
  const candidateZs = dropping ? [zBase, zBase + 1] : [zBase, zBase - 1].filter((z) => z >= 0)

  let best: { z: number; desc: MantissaDescription } | null = null
  for (const z of candidateZs) {
    const mantissa = dropping ? rate * 10 ** z : rate / 10 ** z
    const desc = describeMantissa(mantissa)
    if (!best || desc.err < best.desc.err - 0.005) best = { z, desc }
  }
  // candidateZs always has at least one entry for any finite positive rate
  // outside [0.01, 100], so best is always assigned here.
  const { z, desc } = best!

  const zeroPhrase = dropping ? `Drop ${z} zero${z === 1 ? '' : 's'}` : `Add ${z} zero${z === 1 ? '' : 's'}`
  const text =
    desc.text === 'roughly equal'
      ? `${zeroPhrase}, then it's roughly equal`
      : `${zeroPhrase}, then ${desc.text[0].toLowerCase()}${desc.text.slice(1)}`

  return { text, errorPercent: Math.round(desc.err * 100) }
}
