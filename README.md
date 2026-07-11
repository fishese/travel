# Travel Toolkit

Offline-first travel PWA. No backend — everything lives in the browser
(localStorage/IndexedDB); the only network calls are read-only requests to
free third-party APIs (currency rates, weather, flight status), each cached
locally with a visible staleness indicator.

## Deploying (GitHub Pages, no local install needed)

1. Create a new GitHub repo (this project is configured for a repo named
   `travel` — if you rename it, update `base` in `vite.config.ts` and
   `start_url`/`scope` in the PWA manifest block to match, or you'll get a
   blank page: Vite bakes the repo name into every asset URL at build time,
   so a mismatch there means the JS/CSS 404 silently and React never mounts).
2. Push this folder's contents to the repo's `main` branch — the GitHub web
   UI's "upload files" flow works fine for this, no terminal required.
3. In the repo, go to **Settings → Pages** and set Source to **GitHub
   Actions**.
4. Push (or re-run the workflow from the **Actions** tab) — `.github/workflows/deploy.yml`
   builds and deploys automatically on every push to `main`.

Once deployed, "Add to Home Screen" from your phone's browser installs it as
a standalone app with offline support.

## Local development (optional, needs Node 20+)

```
npm install
npm run dev      # dev server
npm run build    # production build → dist/
npm run preview  # serve the production build locally
```

## Status

See the design spec doc for the full feature roadmap and phase order.
Currently implemented: **currency calculator** (core converter — amount,
from/to picker, swap, named markup profiles with inline add/edit e.g. Cash vs
a specific card, offline rate cache with stale badge, local/home time line),
**shopping notes with inline napkin math** (freeform textarea; lines
containing simple arithmetic — contiguous like `32 x 5` or gap-separated like
`30 per bottle /5` — are auto-calculated and listed below with a running
total and a "use in converter" link; plain notes are left alone),
**gratuity calculator** and **sales tax/VAT calculator** (both now
country-aware — pick a country from the selector at the top and they pull
real tip presets, tax rate, `price_display` mode, and tax-refund info from
`src/data/countries.json`; fall back to generic manual-entry defaults for
anywhere not in the DB yet), and a **cheatsheet** panel (emergency numbers,
HK embassy/consulate contact, dive emergency contacts where relevant, power,
food links, visa summary, pre-arrival forms — all sourced from the same
country DB).

**Country DB status:** 18 of 19 planned destinations loaded (all except
AE/TR — batch 5, pending Gemini quota reset). Two recurring cleanup steps
needed on every batch handoff so far, both handled automatically now rather
than relied on via prompt wording: the merge process breaks the JSON
structure at each batch boundary (fixed with a brace-matching recovery pass
that doesn't depend on knowing where the breaks are), and Gemini wraps a
chunk of URLs in markdown link syntax regardless of being told not to
(stripped automatically). Batch 5, when it lands, will get the same
treatment.

Not yet built: flights, hotels, bookings feed, dive certs, document vault,
settings screen, PWA icons (currently referenced in the manifest but not
generated — add `public/icon-192.png` and `public/icon-512.png` before
shipping, or the install prompt's icon will be blank).
