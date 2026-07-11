# Country DB — Gemini Pro prompt

Run this **5 times**, once per batch below — swap only the `Generate entries
ONLY for these destinations:` line each time. Splitting it up (rather than
all 19 destinations in one prompt) keeps each response short enough that
Gemini doesn't truncate or thin out detail on later entries.

**After each run:** save the JSON Gemini returns as its own file (e.g.
`batch-1.json` ... `batch-5.json`).

**Before trusting anything:** manually click through *every* URL — not just
ones Gemini flagged `"confidence": "low"`. A fabricated-but-plausible `.gov`
URL won't necessarily self-flag. Fix or strip anything that doesn't check
out. Re-run the relevant batch again before each trip to those destinations
rather than treating this as a permanent snapshot — visa rules and
pre-arrival forms change.

---

## The 5 destination lines (swap this one line each run)

**Note:** `IE` (Ireland) was added to batch 4 after checking the actual
"Bountiful British Isles" cruise itinerary — several of its ports (Killybegs,
Dublin, Cork/Cobh) are in the Republic of Ireland, not the UK, so `GB` alone
doesn't cover them.

1. `JP (Japan), KR (South Korea), TW (Taiwan), TH (Thailand), SG (Singapore)`
2. `MY (Malaysia), VN (Vietnam), ID (Indonesia, focus Bali + Raja Ampat/Sorong region), MV (Maldives)`
3. `AU (Australia), NZ (New Zealand), US (United States), CA (Canada)`
4. `GB (United Kingdom), IE (Ireland), FR (France), IT (Italy), CH (Switzerland)`
5. `AE (United Arab Emirates), TR (Turkey), PH (Philippines), DE (Germany), EG (Egypt, focus Red Sea dive destinations)`

## The template (copy this whole block, replace the destinations line, paste into Gemini)

```
You are helping build a static travel reference database for a personal offline-first PWA used by Hong Kong–based leisure tourists.

Output ONLY valid JSON (no markdown fences, no commentary before or after) matching this schema:

{
  "countries": [
    {
      "iso2": "JP",
      "name_en": "Japan",
      "name_zh": "日本",
      "currency": "JPY",
      "emergency": { "police": "110", "ambulance": "119", "fire": "119" },
      "embassy_hk": {
        "name_en": "Hong Kong Economic and Trade Office, Tokyo",
        "phone": "+81-...",
        "address_en": "...",
        "official_url": "..."
      },
      "dive_emergency": {
        "applicable": true,
        "dan_hotline": "...",
        "nearest_hyperbaric_note_en": "...",
        "official_url": "https://dan.org/..."
      },
      "last_verified": "2026-07-11",
      "food_links": [
        { "label": "Tabelog", "url": "https://tabelog.com/" },
        { "label": "Hot Pepper Gourmet", "url": "https://www.hotpepper.jp/" }
      ],
      "power": { "voltage": "100V", "plugs": "A/B (US-style)", "note": "East/West Japan frequency differs" },
      "tipping": {
        "customary": false,
        "default_percents": [0],
        "tip_on": "n/a",
        "note_en": "Not customary; can be awkward"
      },
      "sales_tax": {
        "price_display": "tax_included",
        "default_rate_percent": 10,
        "regions": [],
        "note_en": "Consumption tax included in displayed prices"
      },
      "tax_refund": {
        "available": true,
        "scheme_name_en": "Consumption tax exemption for visitors",
        "typical_rate_percent": 10,
        "min_purchase_note_en": "Often ¥5,000+ per store per day at participating shops",
        "how_it_works_en": "Tax-free at participating stores with passport",
        "where_to_claim_en": "Store and/or airport per receipt type",
        "tips_en": ["Passport required", "Keep receipts"],
        "official_url": "https://www.japan.travel/en/plan/tax-free-shops/"
      },
      "visa_caution": {
        "level": "check_requirements",
        "summary": "Many nationalities visa-free short stay; others need visa — confirm for your passport",
        "official_url": "https://www.mofa.go.jp/..."
      },
      "pre_arrival_forms": [
        {
          "id": "visit-japan-web",
          "name_en": "Visit Japan Web",
          "name_zh": "Visit Japan Web",
          "official_url": "https://vjw-landing.digital.go.jp/en/",
          "applies_to": "all_international_arrivals",
          "required_level": "optional_recommended",
          "lead_days_before": 3,
          "notes_en": "Immigration + customs QR; faster at major airports",
          "notes_zh": "...",
          "confidence": "high"
        }
      ]
    }
  ],
  "airports": [
    {
      "iata": "HND",
      "name": "Tokyo Haneda",
      "city": "Tokyo",
      "country_iso2": "JP",
      "reference_point_en": "Tokyo Station",
      "typical_transport_en": "Tokyo Monorail + JR or Keikyu Line",
      "typical_minutes": 35,
      "international_departure_buffer_hours": 3,
      "assumptions_en": "From Tokyo Station area via public transport; not live traffic; add time for checked bags and peak hours"
    }
  ]
}

The Japan entry above is a filled-in EXAMPLE only, showing the expected shape and level of detail — do not repeat Japan unless it's actually in the destinations list below.

Generate entries ONLY for these destinations: JP (Japan), KR (South Korea), TW (Taiwan), TH (Thailand), SG (Singapore)

For each country include:
- All known pre-arrival digital forms (Visit Japan Web, IMUGA, ESTA, UK ETA, K-ETA, SG Arrival Card, etc.) with OFFICIAL government URLs only
- tipping object (customary, default_percents, tip_on, note_en/zh)
- sales_tax object (price_display: tax_included|tax_added, default_rate_percent, regions[] for US states / CA provinces with rate_percent and caveats — empty array elsewhere)
- tax_refund object when a tourist refund scheme exists; set available:false with a short note when none (US, SG post-2023, etc.)
- Conservative visa_caution — do not claim visa-free without caveat
- Real emergency numbers as exactly three fields: police, ambulance, fire. Many countries share one number across ambulance and fire (in which case just repeat the same value in both fields) — but several don't (e.g. Vietnam, Indonesia, Maldives each use three distinct numbers), so report the real number for each field rather than combining them.
- embassy_hk object — nearest HK Economic and Trade Office or equivalent HK/China consular contact
- dive_emergency object for dive-relevant destinations (Thailand, Maldives, Indonesia, Australia, Malaysia, Philippines, Egypt) — DAN regional hotline + nearest hyperbaric chamber note; set applicable:false elsewhere
- Sensible region-specific food recommendation sites (not generic TripAdvisor unless nothing better exists)
- last_verified: today's date

For airports: cover the major international airport(s) serving that batch's countries only. Use realistic typical_minutes from the most common central reference point and a named public transport mode. Always fill assumptions_en explaining the reference point is generic, not live traffic.

Be factual. If uncertain about a URL or whether a form is still required, set "confidence": "low" on that specific entry. Prefer official .gov / .go.jp / .immigration.* domains. Every URL field must be a plain string (e.g. "https://example.com/") — do NOT wrap URLs in markdown link syntax like "[https://example.com/](https://example.com/)" and do NOT substitute a Google Search redirect link for the real URL.
```

**To run batches 2–5:** copy the template block above again, and replace just
this line with the corresponding line from the numbered list at the top:

```
Generate entries ONLY for these destinations: JP (Japan), KR (South Korea), TW (Taiwan), TH (Thailand), SG (Singapore)
```

---

## After you have all 5 JSON responses

1. Save each as its own `.json` file.
2. Merge: one JSON object with a single `countries` array (all countries from
   all 5 batches concatenated) and a single `airports` array (same).
3. Verify every URL manually (see warning at the top of this doc).
4. Save the merged, verified file as `src/data/countries.json` in this repo
   — the app will read from there once the cheatsheet feature is built.
5. Note the date you did this verification somewhere (e.g. this file's git
   commit date is enough) so you know when it's due for a re-check before
   your next trip to any of these destinations.
