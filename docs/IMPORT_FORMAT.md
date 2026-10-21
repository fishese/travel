# Booking import format

Travel Toolkit can turn a confirmation into flights, hotels, and other bookings
without sending it anywhere. Paste the email, or choose a PDF or text file, and
review the preview before anything is saved. When a confirmation is awkward for
the built-in patterns, an assistant can prepare this JSON file instead. Import
it from **Planner → Import booking**, either by choosing the file or by pasting
the JSON.

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

Use a flight object for real flights. `category: "flight"` is only a fallback
when the ticket does not fit the flight fields. Use a hotel object for hotels.

## Where the file is stored

Imported **text** (flight numbers, hotel names, notes) is saved with the
planner data. Passport and card numbers are stripped from that text even if
the original file is kept.

When a PDF or other file is attached, the preview asks where it should go:

- **With your bookings** uses the public documents area. It stays readable
  without the vault password. This is the default for an ordinary confirmation.
- **Protected vault** is the default when the text looks like a passport,
  identity document, or payment details. Choosing the public area anyway
  requires an explicit confirmation, because the original file can still
  contain those numbers.

One file is linked to every flight, hotel, and booking saved from that import.

## What the text parser will and will not do

The paste and PDF path is a set of patterns, not a language model. It handles
the samples in `src/lib/bookingImport/fixtures/` (Singapore Airlines, Cathay,
United, ANA, JAL, Booking.com, Agoda, Expedia, Trip.com, Jalan, a shinkansen
ticket, Toyota Rent-a-Car, and a museum ticket). PDFs must have a text layer.
A scan or a photo has nothing to read; paste the text or use this JSON file.

Leave a date blank in the preview when the source is ambiguous, such as
`08/09/2026`. The parser does the same instead of guessing month and day.
