interface PdfTextItem {
  str: string
  transform: number[]
}

interface PdfPage {
  getTextContent: () => Promise<{ items: PdfTextItem[] }>
}

interface PdfDocument {
  numPages: number
  getPage: (pageNumber: number) => Promise<PdfPage>
}

interface PdfjsModule {
  getDocument: (src: { data: Uint8Array; useSystemFonts?: boolean }) => { promise: Promise<PdfDocument>; destroy: () => Promise<void> }
  GlobalWorkerOptions: { workerSrc: string }
}

/**
 * Reads the text layer of a PDF in the browser. Scanned pages have no text
 * layer; the caller should say so instead of inventing a booking.
 * `workerSrc` is the pdf.js worker URL (Vite `?url` in the app, a file URL in tests).
 */
export async function extractPdfText(data: Uint8Array, workerSrc: string): Promise<string> {
  const pdfjs = (await import('pdfjs-dist/legacy/build/pdf.mjs')) as unknown as PdfjsModule
  pdfjs.GlobalWorkerOptions.workerSrc = workerSrc
  const task = pdfjs.getDocument({ data, useSystemFonts: true })
  try {
    const doc = await task.promise
    const pages: string[] = []
    for (let pageNumber = 1; pageNumber <= doc.numPages; pageNumber++) {
      const page = await doc.getPage(pageNumber)
      const content = await page.getTextContent()
      pages.push(itemsToLines(content.items))
    }
    const text = pages.map((page) => page.trim()).filter(Boolean).join('\n\n').trim()
    if (!text) {
      throw new Error('No selectable text in this PDF. If it is a scan or a photo, paste the confirmation text instead, or import a JSON file. OCR is not available; other files in this batch can still be saved.')
    }
    return text
  } finally {
    await task.destroy()
  }
}

function itemsToLines(items: PdfTextItem[]): string {
  const lines: string[] = []
  let line: string[] = []
  let currentY: number | null = null
  for (const item of items) {
    if (!item.str) continue
    const y = item.transform[5] ?? 0
    if (currentY !== null && Math.abs(y - currentY) > 2) {
      lines.push(line.join(' ').trim())
      line = []
    }
    currentY = y
    line.push(item.str)
  }
  if (line.length) lines.push(line.join(' ').trim())
  return lines.filter(Boolean).join('\n')
}
