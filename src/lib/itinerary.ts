import { useSetting } from './useSetting'

export interface ItineraryMeta {
  title: string
  fileName: string
  uploadedAt: string // ISO
}

function extractTitle(html: string): string | null {
  const match = html.match(/<title[^>]*>([^<]*)<\/title>/i)
  return match ? match[1].trim() : null
}

/**
 * Deliberately a single slot, not a list — this is "the current trip's
 * itinerary," uploaded once per trip and replaced (not archived) once the
 * next one starts. Stored as plain localStorage via useSetting rather than
 * the IndexedDB file vault (lib/fileVault.ts): it's one string, comfortably
 * inside typical localStorage limits even for a hand-built HTML file, and
 * being a normal travel_-prefixed setting means it's automatically covered
 * by session export/import (lib/sessionTransfer.ts) for free, with no
 * separate wiring needed there.
 */
export function useItinerary() {
  const [html, setHtml] = useSetting<string>('travel_itinerary_html', '')
  const [meta, setMeta] = useSetting<ItineraryMeta | null>('travel_itinerary_meta', null)

  function upload(fileName: string, content: string) {
    setHtml(content)
    setMeta({
      title: extractTitle(content) || fileName.replace(/\.html?$/i, ''),
      fileName,
      uploadedAt: new Date().toISOString(),
    })
  }

  function clear() {
    setHtml('')
    setMeta(null)
  }

  return { html, meta, upload, clear }
}
