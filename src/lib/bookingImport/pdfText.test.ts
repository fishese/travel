import { describe, expect, it } from 'vitest'
import { extractPdfText } from './pdfText'
import { parseBookingDocument } from './textParse'

function simplePdf(lines: string[]): Uint8Array { return multiPagePdf([lines]) }

function multiPagePdf(pages: string[][]): Uint8Array {
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    `<< /Type /Pages /Kids [${pages.map((_, i) => `${4 + i * 2} 0 R`).join(' ')}] /Count ${pages.length} >>`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  ]
  pages.forEach((lines, i) => {
    const stream = lines.map((line, j) => `BT /F1 12 Tf 72 ${720 - j * 18} Td (${line}) Tj ET`).join('\n')
    objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents ${5 + i * 2} 0 R /Resources << /Font << /F1 3 0 R >> >> >>`)
    objects.push(`<< /Length ${stream.length} >> stream\n${stream}\nendstream`)
  })
  let body = '%PDF-1.4\n'
  const offsets = [0]
  objects.forEach((obj, i) => { offsets.push(body.length); body += `${i + 1} 0 obj ${obj} endobj\n` })
  const xrefPos = body.length
  body += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`
  for (const offset of offsets.slice(1)) body += `${String(offset).padStart(10, '0')} 00000 n \n`
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


describe('PDF page selection', () => {
  const worker = new URL('../../../node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs', import.meta.url).href
  it('excludes the first page and retains all remaining pages', async () => {
    const text = await extractPdfText(multiPagePdf([['COVER ONLY'], ['Flight BA321'], ['Departure 2031-02-18']]), worker, { skipFirstPage: true })
    expect(text).not.toContain('COVER ONLY')
    expect(text).toContain('BA321')
    expect(text).toContain('2031-02-18')
  })
  it('explains how to recover when skipping a single-page PDF', async () => {
    await expect(extractPdfText(simplePdf(['Flight BA321']), worker, { skipFirstPage: true })).rejects.toThrow('only one page')
  })
  it('does not mistake cover text for a selectable-text booking', async () => {
    await expect(extractPdfText(multiPagePdf([['COVER ONLY'], []]), worker, { skipFirstPage: true })).rejects.toThrow('No selectable text')
  })
})
