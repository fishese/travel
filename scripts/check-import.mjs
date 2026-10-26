import { readFile } from 'node:fs/promises'
import { createServer } from 'vite'

// Offline dry run: only counts leave the parser. No browser storage is changed.
const [path, ...extra] = process.argv.slice(2)
if (!path || extra.length) {
  console.error('Usage: npm run import:check -- <confirmation.txt or import.json>')
  process.exitCode = 2
} else {
  const server = await createServer({ configFile: false, logLevel: 'silent', server: { middlewareMode: true }, appType: 'custom' })
  try {
    const { parseImportInput } = await server.ssrLoadModule('/src/lib/bookingImport/jsonFormat.ts')
    const { flightReady, hotelReady, bookingReady } = await server.ssrLoadModule('/src/lib/bookingImport/storage.ts')
    const result = parseImportInput(await readFile(path, 'utf8'))
    if (!result.ok) {
      console.error('Import validation failed. Review the file in Planner → Import booking for details.')
      process.exitCode = 2
    } else {
      const preview = result.preview
      const invalid = preview.flights.filter((row) => !flightReady(row)).length
        + preview.hotels.filter((row) => !hotelReady(row)).length
        + preview.bookings.filter((row) => !bookingReady(row)).length
      const total = preview.flights.length + preview.hotels.length + preview.bookings.length
      const warnings = preview.warnings.length + [...preview.flights, ...preview.hotels, ...preview.bookings].reduce((sum, row) => sum + row.warnings.length, 0)
      console.log(JSON.stringify({ flights: preview.flights.length, hotels: preview.hotels.length, bookings: preview.bookings.length, needCorrection: invalid, warnings, sensitiveFindings: preview.sensitive.length }))
      if (invalid || !total) process.exitCode = 2
    }
  } catch {
    console.error('Could not read or validate the import file.')
    process.exitCode = 2
  } finally {
    await server.close()
  }
}
