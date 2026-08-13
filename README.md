# Travel Toolkit

Offline-first travel PWA. No backend: trip data lives in the browser
(localStorage/IndexedDB). Network calls are read-only requests to free
third-party APIs for rates, weather, location, hotel lookup and optional flight
status; results are cached locally with visible staleness indicators.

## Deploying (GitHub Pages)

This project is configured for the custom domain `traveltools.fishese.cc` at
the site root. Keep `base` in `vite.config.ts` and the PWA `start_url`/`scope`
at `/` when using that domain. A project-pages prefix such as `/travel/` will
make the asset URLs wrong after the custom domain is attached.

1. Push this folder to the repository's `main` branch.
2. In GitHub, choose Settings -> Pages -> GitHub Actions.
3. Push again or re-run the deploy workflow.

Once deployed, use Add to Home Screen to install the standalone app. Production
hosting should use HTTPS so Web Crypto and persistent storage are available.

## Local development

```text
npm install
npm run dev
npm run build
npm run lint
npm run preview
```

## Features

Currency conversion with per-base offline caches, markup profiles, shopping
math, gratuity and VAT/tax tools, weather and location lookup, flight records
and optional live status, hotel records with map lookup and driver view,
generic bookings, dive certificates, encrypted local document storage,
personally-authored itinerary HTML, reminders, country cheatsheets, airport
transfer guidance, an offline-readiness checklist, a grouped-currency expense
log, PWA offline caching, and backup/restore.

The bundled country database contains 26 destinations and 28 airport records.
Visa, tax, arrival-form and emergency information is reference material: every
country shows a last-verified date and official-source links. Re-check it before
relying on it for a real trip.

## Privacy, storage and backups

Vault files are encrypted at rest with a random AES-GCM key held in a separate
device-local database. Clearing browser/site data also clears that key, so
those files cannot be recovered without a backup. The app requests persistent
storage where supported, but browsers may still evict site data; export before
each trip and test a restore.

Backups include all app settings and attached files, including the Aviationstack
key. Export with an optional password to encrypt the complete backup using
PBKDF2-SHA-256 and AES-GCM. Leave the password blank for an ordinary JSON
backup. Keep a password-protected backup and its password separately.

Itinerary HTML is intentionally opened with full browser trust so navigation
scripts and other features in personally-authored files continue to work. Only
open itinerary files you built or trust: arbitrary HTML can read or change data
available to its document context. If active scripts are unnecessary, prefer a
PDF or static HTML file.

## Planned additions

Trip grouping/archiving, a richer travel-day action dashboard, and a dedicated
insurance/medical card with its own protected storage are still future work.
