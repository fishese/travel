import { parseImportInput } from './jsonFormat'
import type { ParsedImport } from './types'

export interface ImportDocument {
  name: string
  file?: File
  preview: ParsedImport
}

export interface ImportIssue { name: string; error: string }

const MAX_FILE_BYTES = 20 * 1024 * 1024
export const MAX_IMPORT_FILES = 50

/** Local-only queue. One unreadable file must not discard the other previews. */
export async function readImportFiles(
  files: readonly File[],
  readPdf: (bytes: Uint8Array) => Promise<string>,
): Promise<{ documents: ImportDocument[]; issues: ImportIssue[] }> {
  const documents: ImportDocument[] = []
  const issues: ImportIssue[] = []
  if (files.length > MAX_IMPORT_FILES) {
    return { documents, issues: [{ name: 'Batch', error: `Choose at most ${MAX_IMPORT_FILES} files at a time.` }] }
  }
  for (const file of files) {
    try {
      if (file.size > MAX_FILE_BYTES) throw new Error('This file is over 20 MB. Split it into smaller files.')
      const extension = file.name.split('.').at(-1)?.toLowerCase()
      if (extension === 'html' || extension === 'htm') throw new Error('HTML plans belong in the Itinerary section below.')
      if (!['pdf', 'txt', 'json'].includes(extension ?? '')) throw new Error('Choose a PDF, text, or JSON file.')
      const text = extension === 'pdf' ? await readPdf(new Uint8Array(await file.arrayBuffer())) : await file.text()
      const result = parseImportInput(text)
      if (!result.ok) throw new Error(result.error)
      const preview = result.preview
      if (preview.flights.length + preview.hotels.length + preview.bookings.length === 0) {
        throw new Error(preview.warnings.join(' ') || 'No bookings found. Paste text or use a JSON import.')
      }
      documents.push({ name: file.name, file, preview })
    } catch (caught) {
      issues.push({ name: file.name, error: caught instanceof Error ? caught.message : 'Could not read this file.' })
    }
  }
  return { documents, issues }
}
