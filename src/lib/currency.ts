// Currency rates: fetched when online, cached for offline use.
// Source of truth for the "hero" converter (spec §1).

const CACHE_KEY = 'travel_fx_cache_v1'
const STALE_AFTER_MS = 24 * 60 * 60 * 1000 // 24h, per spec

export interface RateCache {
  base: string
  rates: Record<string, number>
  fetchedAt: string // ISO 8601
}

/** All ISO 4217 currency codes the runtime knows about — no hand-maintained list. */
export function listCurrencyCodes(): string[] {
  // Intl.supportedValuesOf is available in all currently-shipping evergreen
  // browsers; if it's ever missing, fall back to a small common-code list
  // rather than crashing the converter.
  try {
    return Intl.supportedValuesOf('currency')
  } catch {
    return ['USD', 'EUR', 'GBP', 'JPY', 'HKD', 'TWD', 'THB', 'SGD', 'AUD', 'CNY']
  }
}

const enNames = new Intl.DisplayNames(['en'], { type: 'currency' })
const zhNames = (() => {
  try {
    return new Intl.DisplayNames(['zh'], { type: 'currency' })
  } catch {
    return null
  }
})()

export function currencyLabel(code: string): { en: string; zh?: string } {
  return {
    en: enNames.of(code) ?? code,
    zh: zhNames?.of(code),
  }
}

function readCache(): RateCache | null {
  const raw = localStorage.getItem(CACHE_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as RateCache
  } catch {
    return null
  }
}

function writeCache(cache: RateCache) {
  localStorage.setItem(CACHE_KEY, JSON.stringify(cache))
}

export function isStale(cache: RateCache | null): boolean {
  if (!cache) return true
  return Date.now() - new Date(cache.fetchedAt).getTime() > STALE_AFTER_MS
}

/**
 * Fetch latest rates for `base`. Tries Frankfurter first (ECB-sourced, no
 * key), falls back to open.er-api.com. On any network failure, returns the
 * last cached snapshot (possibly stale) rather than throwing — the
 * converter should never go blank just because the connection dropped.
 */
export async function getRates(base: string): Promise<{ cache: RateCache; stale: boolean; offline: boolean }> {
  const cached = readCache()
  const cacheMatchesBase = cached?.base === base

  try {
    const res = await fetch(`https://api.frankfurter.app/latest?from=${base}`)
    if (!res.ok) throw new Error(`frankfurter ${res.status}`)
    const data = await res.json()
    const fresh: RateCache = {
      base,
      rates: { ...data.rates, [base]: 1 },
      fetchedAt: new Date().toISOString(),
    }
    writeCache(fresh)
    return { cache: fresh, stale: false, offline: false }
  } catch {
    // fallback source
    try {
      const res = await fetch(`https://open.er-api.com/v6/latest/${base}`)
      if (!res.ok) throw new Error(`open.er-api ${res.status}`)
      const data = await res.json()
      const fresh: RateCache = {
        base,
        rates: data.rates,
        fetchedAt: new Date().toISOString(),
      }
      writeCache(fresh)
      return { cache: fresh, stale: false, offline: false }
    } catch {
      // both sources unreachable — serve cache if we have one for this base
      if (cached && cacheMatchesBase) {
        return { cache: cached, stale: isStale(cached), offline: true }
      }
      throw new Error('No network and no cached rates for this currency pair.')
    }
  }
}

export interface ConversionResult {
  raw: number // straight FX conversion, no markup
  withMarkup: number // adjusted for card/FX spread
}

export function convert(amount: number, rate: number, markupPercent: number): ConversionResult {
  const raw = amount * rate
  // Card/FX spread makes the real-world cost WORSE than the quoted mid-market
  // rate — it increases what you actually pay, so markup adds to the result,
  // it doesn't discount it. A 0% profile (e.g. paying cash) is just a
  // markup-free pass-through, not a separate "disabled" state.
  const withMarkup = raw * (1 + markupPercent / 100)
  return { raw, withMarkup }
}
