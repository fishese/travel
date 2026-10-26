import { describe, expect, it } from 'vitest'
import { extractPdfText } from './pdfText'
import { parseBookingDocument } from './textParse'

function simplePdf(lines: string[]): Uint8Array {
  const stream = lines.map((line, index) => {
    const escaped = line.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)')
    return `BT /F1 12 Tf 72 ${720 - index * 18} Td (${escaped}) Tj ET`
  }).join('\n')
  const objects = [
    '1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj\n',
    '2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj\n',
    '3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >> endobj\n',
    `4 0 obj << /Length ${stream.length} >> stream\n${stream}\nendstream\nendobj\n`,
    '5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj\n',
  ]
  let body = '%PDF-1.4\n'
  const offsets = [0]
  for (const obj of objects) {
    offsets.push(body.length)
    body += obj
  }
  const xrefPos = body.length
  let xref = `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`
  for (let i = 1; i <= objects.length; i++) xref += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`
  body += xref
  body += `trailer << /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefPos}\n%%EOF`
  return new TextEncoder().encode(body)
}

describe('extractPdfText', () => {
  it('releases each loading task without breaking the next PDF in a batch', async () => {
    const workerSrc = new URL('../../../node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs', import.meta.url).href
    for (const number of ['321', '322']) {
      const text = await extractPdfText(simplePdf([`Flight BA${number}`, 'Departure 2030-04-10 09:00']), workerSrc)
      expect(text).toContain(`BA${number}`)
    }
  })
  it('reads a text-layer e-ticket offline', async () => {
    const workerSrc = new URL('../../../node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs', import.meta.url).href
    const text = await extractPdfText(
      simplePdf([
        'Flight SQ638 from HKG to NRT',
        'on 25 Aug 2026.',
        'Departs 08:45. Arrives 14:10.',
        'Booking reference ABC123.',
      ]),
      workerSrc,
    )
    expect(text).toContain('SQ638')
    expect(text).toContain('ABC123')
    const parsed = parseBookingDocument(text, '2026-01-15')
    expect(parsed.flights[0]).toMatchObject({ flightIata: 'SQ638', origin: 'HKG', destination: 'NRT', date: '2026-08-25', departureTime: '08:45', arrivalTime: '14:10' })
    expect(parsed.flights[0].notes).toContain('ABC123')
  })
})
