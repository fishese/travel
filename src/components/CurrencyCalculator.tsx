import { useEffect, useState } from 'react'
import { convert, getRates, isStale, type RateCache } from '../lib/currency'
import { formatTimeInZone, guessLocalTimeZone } from '../lib/time'
import { useSetting } from '../lib/useSetting'
import { useMarkupProfiles } from '../lib/markupProfiles'
import { getCountry } from '../lib/countries'
import { useCurrentCountry } from '../lib/currentCountry'
import { CurrencyPicker } from './CurrencyPicker'
import { MarkupProfileBar } from './MarkupProfiles'
import { ShoppingNotes } from './ShoppingNotes'
import { GratuityCalculator } from './GratuityCalculator'
import { SalesTaxCalculator } from './SalesTaxCalculator'

export function CurrencyCalculator() {
  const [homeCurrency] = useSetting('travel_home_currency', 'HKD')
  const [homeTimezone] = useSetting('travel_home_timezone', 'Asia/Hong_Kong')
  const { active: markupProfile } = useMarkupProfiles()
  const { iso2: countryIso2 } = useCurrentCountry()
  const country = countryIso2 ? getCountry(countryIso2) : undefined

  const [from, setFrom] = useState(homeCurrency) // home side
  const [to, setTo] = useState(homeCurrency) // local/destination side — same convention GratuityCalculator and SalesTaxCalculator already use
  const [amount, setAmount] = useState('100')

  // Sync "to" to the selected country's currency whenever the country
  // selection itself changes (not on every render, so a manual override
  // afterwards — e.g. checking EUR while actually in Japan — isn't clobbered
  // until the country picker changes again).
  useEffect(() => {
    if (country) {
      setTo(country.currency)
    }
    // country is a stable reference for a given countryIso2 (looked up from
    // a module-level constant), so this only actually re-runs when the
    // country selection itself changes.
  }, [countryIso2, country])

  const [cache, setCache] = useState<RateCache | null>(null)
  const [offline, setOffline] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    getRates(from)
      .then((result) => {
        if (cancelled) return
        setCache(result.cache)
        setOffline(result.offline)
      })
      .catch((e: Error) => {
        if (cancelled) return
        setError(e.message)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [from])

  const localTz = guessLocalTimeZone(homeTimezone)
  const localTime = formatTimeInZone(localTz)
  const homeTime = formatTimeInZone(homeTimezone)
  const sameTz = localTz === homeTimezone

  const rate = cache?.rates[to]
  const parsedAmount = parseFloat(amount) || 0
  const result = rate ? convert(parsedAmount, rate, markupProfile.percent) : null
  const stale = isStale(cache)

  function swap() {
    setFrom(to)
    setTo(from)
  }

  return (
    <>
    <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3 shadow-sm">
      {/* time line — one quiet ticket-stub touch, not repeated elsewhere */}
      <div className="flex items-center gap-2 text-xs text-[var(--color-muted)] mb-2 pb-1.5 border-b border-dashed border-[var(--color-border)]">
        <span className="tabular">Local {localTime}</span>
        {!sameTz && (
          <>
            <span aria-hidden>·</span>
            <span className="tabular">Home {homeTime}</span>
          </>
        )}
      </div>

      <div className="grid grid-cols-[1fr_auto_1fr] gap-2 items-start mb-2">
        <CurrencyPicker label="From" value={from} onChange={setFrom} />
        <button
          type="button"
          onClick={swap}
          aria-label="Swap currencies"
          className="mt-5 rounded-full border border-[var(--color-border)] w-8 h-8 flex items-center justify-center text-[var(--color-pine)] hover:bg-[var(--color-pine-dim)] shrink-0"
        >
          ⇄
        </button>
        <CurrencyPicker label="To" value={to} onChange={setTo} />
      </div>

      <label className="block mb-2">
        <span className="block text-xs text-[var(--color-muted)] mb-0.5">Amount</span>
        <input
          inputMode="decimal"
          value={amount}
          onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ''))}
          className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-xl tabular font-display"
        />
      </label>

      <MarkupProfileBar />

      {/* the one number that matters */}
      <div className="rounded-xl bg-[var(--color-pine-dim)] px-3 py-3 mb-2">
        {loading && !cache && (
          <p className="text-sm text-[var(--color-muted)]">Fetching rate…</p>
        )}
        {error && !cache && (
          <p className="text-sm text-[var(--color-amber)]">{error}</p>
        )}
        {result && (
          <>
            <p className="text-2xl font-display tabular text-[var(--color-pine)]">
              {result.withMarkup.toLocaleString(undefined, { maximumFractionDigits: 2 })}{' '}
              <span className="text-base">{to}</span>
            </p>
            {markupProfile.percent > 0 && (
              <p className="text-xs text-[var(--color-muted)] mt-0.5">
                Includes ~{markupProfile.percent}% ({markupProfile.label}) for card/FX spread ·
                raw rate: {result.raw.toLocaleString(undefined, { maximumFractionDigits: 2 })} {to}
              </p>
            )}
          </>
        )}
      </div>

      <div className="flex items-center justify-end text-xs text-[var(--color-muted)]">
        {cache && (
          <span className={stale ? 'text-[var(--color-amber)]' : ''}>
            {offline ? 'Offline · ' : ''}
            {stale ? 'Stale · ' : ''}
            as of {new Date(cache.fetchedAt).toLocaleString(undefined, {
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
        )}
      </div>
    </section>

    <ShoppingNotes currency={to} onUseAmount={(v) => setAmount(String(v))} />
    <GratuityCalculator currency={to} onUseAmount={(v) => setAmount(String(v))} />
    <SalesTaxCalculator currency={to} onUseAmount={(v) => setAmount(String(v))} />
    </>
  )
}
