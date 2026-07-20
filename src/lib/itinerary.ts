import { saveFile, useVaultFiles, type VaultFile } from './fileVault'

function extractTitle(html: string): string | null {
  const match = html.match(/<title[^>]*>([^<]*)<\/title>/i)
  return match ? match[1].trim() : null
}

/**
 * A handful of saved itinerary pages (one per trip, kept around rather
 * than replaced) — reuses the same IndexedDB file vault Documents and dive
 * cert photos already use, filtered to the 'itinerary' category. Piggybacks
 * on that vault's existing generic export/import support in
 * lib/sessionTransfer.ts for free — no extra backup/restore wiring needed
 * here, same as Documents needed none for its own files.
 */
export function useSavedItineraries() {
  return useVaultFiles('itinerary')
}

/** Reads the file once up front to pull a nicer label from its <title>
 * tag than the raw filename would give — falls back to the filename
 * (minus extension) if there's no title to find. */
export async function saveItinerary(file: File): Promise<VaultFile> {
  const text = await file.text()
  const title = extractTitle(text) || file.name.replace(/\.html?$/i, '')
  return saveFile(file, title, 'itinerary')
}
