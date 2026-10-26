# Booking import format

Travel Toolkit can turn a confirmation into flights, hotels, and other bookings
without sending it anywhere. Paste the email, or choose a PDF or text file, and
review the preview before anything is saved. When a confirmation is awkward for
the built-in patterns, an assistant can prepare this JSON file instead. Import
it from **Planner → Import booking**, either by choosing the file or by pasting
the JSON.

You can select multiple files, choose a folder on supporting browsers, or drop
files onto Import booking. A batch supports up to 50 files, each up to 20 MB.
An unreadable file gets its own error; it does not discard other previews.
HTML plans are uploaded separately in **Itinerary**. No file is sent to a server.

Choose **Import into** explicitly when viewing All trips or Unassigned records.
You can select a trip or deliberately leave the records unassigned. After saving,
the app selects that destination so the new records are visible. Active trip is
also available at the top of Planner.

Likely duplicates are skipped by default, including duplicates within one batch.
Flight matching uses number and date; hotels use name and check-in; other
bookings use category, label and date. Text matching ignores casing and repeated
spaces. Matching also checks records assigned to other trips. Select **Keep
duplicates as additional records** only when another copy is intended. Existing
records are never replaced by booking import.

All preview rows start selected, including incomplete drafts. Correct missing
fields or uncheck those rows. The save summary shows how many records will be
saved, need correction, or will be skipped as duplicates. Nothing saves until
**Save selected** is pressed.

If a hotel confirmation appears as an ordinary booking, choose **Hotel** in that
row's category selector. It becomes a hotel preview with check-in, check-out,
city, address and phone fields. The previous title, date and notes are kept for
review; a missing check-out date defaults to the day after check-in. It is saved in Hotels rather
than as a generic booking, and its source-file link and trip assignment follow it.

The format name is `travel-toolkit-import`, version **1**. A JSON Schema lives
at [`import-format.schema.json`](import-format.schema.json). A full example is
[`examples/japan-trip.json`](examples/japan-trip.json).

Nothing in the file is saved until the person reviews the preview and taps
**Save selected**. The HTML day-by-day itinerary is a different feature and is
not part of this format.

## Shape

```json
{
  "format": "travel-toolkit-import",
  "version": 1,
  "flights": [],
  "hotels": [],
  "bookings": []
}
```

`version` is the number `1`, not a string. Unknown properties are ignored.
Dates are `YYYY-MM-DD`. Times are 24-hour `HH:mm`. At least one flight, hotel,
or booking is required.

Do not put passport numbers, card numbers, or card security codes in the file.
If they are present, the app removes them from the text it stores and suggests
keeping the original file in the vault.

### Flights

| Field | Required | Notes |
| --- | --- | --- |
| `flightNumber` | yes | `SQ638`. A space (`SQ 638`) is removed. |
| `date` | yes | Departure date. |
| `origin`, `destination` | no | 3-letter codes such as `HKG` and `NRT`. |
| `departureTime`, `arrivalTime` | no | Local to that airport, as printed on the ticket. |
| `arrivalDate` | no | Set this when arrival is a different calendar day. |
| `confirmation` | no | Stored in notes as `Confirmation: …`. |
| `passengers` | no | List of names. Stored in notes. |
| `notes` | no | Seat, cabin, baggage, or anything else worth keeping. |

### Hotels

| Field | Required | Notes |
| --- | --- | --- |
| `name` | yes | |
| `city`, `address`, `phone` | no | |
| `checkIn`, `checkOut` | no | |
| `confirmation`, `guests`, `price` | no | Folded into notes. `guests` and `price` are strings (`"2 adults"`, `"JPY 186000"`). |
| `notes` | no | |

### Other bookings

Trains, car rentals, tours, restaurants, shows, and anything else use `bookings`.

| Field | Required | Notes |
| --- | --- | --- |
| `category` | yes | `train`, `car`, `tour`, `restaurant`, `show`, `flight`, or `other`. |
| `label` | yes | What to show on the day, such as `Nozomi 123 Tokyo → Shin-Osaka`. |
| `date` | yes | |
| `time` | no | |
| `confirmation`, `notes` | no | Confirmation is folded into notes. |
| `operator`, `serviceNumber` | no | Train operator/service type and service number. |
| `origin`, `destination` | no | Train station names (not airport codes). |
| `arrivalDate`, `arrivalTime` | no | Local arrival date and time. |
| `coach`, `seat` | no | Separate train seating fields. |

These optional journey fields extend version 1. Existing bookings without them
still work; older route or arrival information in notes is preserved, not guessed
or migrated. The train editor exposes these fields in both preview and saved
bookings. The text parser recognizes repeated supported service lines, including
TGV, ICE, Intercity and Railjet as well as the previously supported services.

Use a flight object for real flights. `category: "flight"` is only a fallback
when the ticket does not fit the flight fields. Use a hotel object for hotels.

## Where the file is stored

Imported fields (flight numbers, hotel names, notes) are saved with planner data.
The complete extracted source text is not retained unless **Keep redacted
extracted text with each record** is selected. Passport and card numbers are
stripped from that text even if the original file is kept.

When a PDF or other file is attached, the preview asks where it should go:

- **With your bookings** uses the public documents area. It stays readable
  without the vault password. This is the default for an ordinary confirmation.
- **Protected vault** is the default when the text looks like a passport,
  identity document, or payment details. Choosing the public area anyway
  requires an explicit confirmation, because the original file can still
  contain those numbers.
- **Do not keep the original file** saves just the selected record fields.

Each source file has its own storage choice. Only sources contributing saved
records are attached. A file links to the records created from that source,
not to other files' records in the batch.

One file is linked to every flight, hotel, and booking saved from that import.

## What the text parser will and will not do

The paste and PDF path is a set of patterns, not a language model. It handles
the samples in `src/lib/bookingImport/fixtures/` (Singapore Airlines, Cathay,
United, ANA, JAL, Booking.com, Agoda, Expedia, Trip.com, Jalan, a shinkansen
ticket, Toyota Rent-a-Car, and a museum ticket). PDFs must have a text layer.
A scan or a photo has nothing to read; paste the text or use this JSON file.

OCR is not included. A scanned PDF produces an actionable error, and other
text-layer PDFs in the same batch can still be reviewed and saved.

Leave a date blank in the preview when the source is ambiguous, such as
`08/09/2026`. The parser does the same instead of guessing month and day.

## Offline validation for automation

From a checkout with dependencies installed, run:

```sh
npm run --silent import:check -- /path/to/import.json
```

Text confirmations (`.txt`) work too. This uses the same parser and readiness
checks as the app. Output contains counts only, never document text or field
values. Exit status is 0 for recognized, ready records and 2 for a read/parse
failure, no records, or records requiring correction. It does not check browser
duplicates, attach documents, write device storage, or send data to any API.
Import the reviewed file in the intended PWA context to save it there.

## Date defaults in forms and previews

A blank train arrival date defaults to its departure date. A blank hotel check-out
date defaults to the day after check-in. These defaults also apply after filling
an unresolved departure/check-in date or changing a booking to a train or hotel.
Existing arrival/check-out dates are preserved, including overnight journeys and
longer stays. Review the defaults before saving; changing the start date does not
overwrite an arrival/check-out date that is already filled. Ambiguous start dates
are left blank rather than guessed. Saved records are not changed until you save
the form.
