import { listFiles, putFile, clearAllFiles, type VaultFile } from './fileVault'
import { writeSettingExternally } from './useSetting'

// Every setting this app writes uses this prefix (confirmed by grepping
// every localStorage.getItem/setItem call site) — scanning by prefix
// means a new setting added later is automatically included in exports
// without this file needing to know its key name.
const KEY_PREFIX = 'travel_'

// The only keys 'merge' mode ever touches: the trip-data lists, each a
// JSON array of records with a unique `id`. Merging means "add whatever's
// in the import that isn't already here by id" — everything else
// (currency/theme/API key/shopping notes/section order/etc.) is left
// exactly as the current device has it, on the theory that those are
// per-device preferences or transient scratch state, not trip data you'd
// want synced between devices. A record is never edited in place anywhere
// in this app (only added or deleted), so an id collision always means
// "the same record on both sides" — there's no meaningful conflict to
// resolve, just a duplicate to skip.
const MERGEABLE_LIST_KEYS = [
  { key: 'travel_flights', label: 'flights' as const },
  { key: 'travel_hotels', label: 'hotels' as const },
  { key: 'travel_bookings', label: 'bookings' as const },
  { key: 'travel_dive_certs', label: 'dive certs' as const },
]
const DISMISSED_REMINDERS_KEY = 'travel_dismissed_reminders'

export type ImportMode = 'replace' | 'merge'

interface ExportedFile {
  id: string
  mimeType: string
  label: string
  category: VaultFile['category']
  linkedId?: string
  savedAt: string
  dataBase64: string
}

export interface SessionExport {
  exportedAt: string
  appVersion: 1
  localStorage: Record<string, string>
  files: ExportedFile[]
}

async function blobToBase64(blob: Blob): Promise<string> {
  const buf = await blob.arrayBuffer()
  const bytes = new Uint8Array(buf)
  // Chunked to avoid blowing the call stack on String.fromCharCode(...) for
  // a large image — a few MB of bytes as one spread argument list can
  // exceed engine limits.
  const chunkSize = 0x8000
  let binary = ''
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize))
  }
  return btoa(binary)
}

function base64ToBlob(base64: string, mimeType: string): Blob {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return new Blob([bytes], { type: mimeType })
}

async function buildSessionExport(): Promise<SessionExport> {
  const localStorageData: Record<string, string> = {}
  for (const key of Object.keys(localStorage)) {
    if (!key.startsWith(KEY_PREFIX)) continue
    const value = localStorage.getItem(key)
    if (value !== null) localStorageData[key] = value
  }

  const vaultFiles = await listFiles()
  const files: ExportedFile[] = await Promise.all(
    vaultFiles.map(async (f) => ({
      id: f.id,
      mimeType: f.mimeType,
      label: f.label,
      category: f.category,
      linkedId: f.linkedId,
      savedAt: f.savedAt,
      dataBase64: await blobToBase64(f.blob),
    })),
  )

  return { exportedAt: new Date().toISOString(), appVersion: 1, localStorage: localStorageData, files }
}

/** Builds the backup and triggers a browser download — a plain JSON file
 * with images/documents embedded as base64, which is plenty for this
 * app's scale (a handful of files per trip, not a data-heavy archive). */
export async function downloadSessionExport(): Promise<{ settingsCount: number; filesCount: number }> {
  const data = await buildSessionExport()
  const json = JSON.stringify(data)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `travel-toolkit-backup-${new Date().toISOString().slice(0, 10)}.json`
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
  return { settingsCount: Object.keys(data.localStorage).length, filesCount: data.files.length }
}

function isSessionExport(data: unknown): data is SessionExport {
  if (!data || typeof data !== 'object') return false
  const d = data as Record<string, unknown>
  return typeof d.localStorage === 'object' && d.localStorage !== null && Array.isArray(d.files)
}

export interface ReplaceSummary {
  mode: 'replace'
  settingsCount: number
  filesCount: number
}

export interface MergeSummary {
  mode: 'merge'
  added: { flights: number; hotels: number; bookings: number; 'dive certs': number; files: number }
}

export type ImportSummary = ReplaceSummary | MergeSummary

function parseJsonArray<T>(raw: string | undefined | null): T[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as T[]) : []
  } catch {
    return []
  }
}

async function mergeSession(data: SessionExport): Promise<MergeSummary> {
  const added: MergeSummary['added'] = { flights: 0, hotels: 0, bookings: 0, 'dive certs': 0, files: 0 }

  for (const { key, label } of MERGEABLE_LIST_KEYS) {
    const current = parseJsonArray<{ id: string }>(localStorage.getItem(key))
    const imported = parseJsonArray<{ id: string }>(data.localStorage[key])
    const currentIds = new Set(current.map((item) => item.id))
    const merged = [...current]
    for (const item of imported) {
      if (currentIds.has(item.id)) continue
      merged.push(item)
      added[label]++
    }
    writeSettingExternally(key, merged)
  }

  // Union, not counted individually — a dismissed-reminder id on its own
  // isn't meaningful feedback to show, it's just bookkeeping that should
  // travel along with the flights/hotels/bookings it refers to.
  const currentDismissed = parseJsonArray<string>(localStorage.getItem(DISMISSED_REMINDERS_KEY))
  const importedDismissed = parseJsonArray<string>(data.localStorage[DISMISSED_REMINDERS_KEY])
  writeSettingExternally(DISMISSED_REMINDERS_KEY, [...new Set([...currentDismissed, ...importedDismissed])])

  const existingFiles = await listFiles()
  const existingIds = new Set(existingFiles.map((f) => f.id))
  for (const f of data.files) {
    if (existingIds.has(f.id)) continue
    await putFile({
      id: f.id,
      blob: base64ToBlob(f.dataBase64, f.mimeType),
      mimeType: f.mimeType,
      label: f.label,
      category: f.category,
      linkedId: f.linkedId,
      savedAt: f.savedAt,
    })
    added.files++
  }

  return { mode: 'merge', added }
}

async function replaceSession(data: SessionExport): Promise<ReplaceSummary> {
  // File vault restore happens first: if this fails partway (e.g. an
  // IndexedDB quota error), the existing localStorage settings are still
  // untouched below, rather than this import having already wiped them
  // out before hitting the failure.
  await clearAllFiles()
  for (const f of data.files) {
    await putFile({
      id: f.id,
      blob: base64ToBlob(f.dataBase64, f.mimeType),
      mimeType: f.mimeType,
      label: f.label,
      category: f.category,
      linkedId: f.linkedId,
      savedAt: f.savedAt,
    })
  }

  for (const key of Object.keys(localStorage)) {
    if (key.startsWith(KEY_PREFIX)) localStorage.removeItem(key)
  }
  for (const [key, value] of Object.entries(data.localStorage)) {
    if (key.startsWith(KEY_PREFIX)) localStorage.setItem(key, value)
  }

  return { mode: 'replace', settingsCount: Object.keys(data.localStorage).length, filesCount: data.files.length }
}

/**
 * 'replace' fully replaces the app's current data with the backup's —
 * every existing travel_ setting and every vault file is cleared first,
 * then repopulated from the import. Lands in exactly the state the backup
 * was taken in, full stop.
 *
 * 'merge' only ever adds: any flight/hotel/booking/dive-cert/file in the
 * backup that isn't already present (by id) gets added alongside what's
 * already here. Nothing is removed and every other setting (currency,
 * theme, API key, shopping notes, section order, etc.) is left as the
 * current device has it. Meant for "I added a few things on my phone and
 * a few things on my laptop, bring them together" rather than a full
 * restore.
 *
 * Either way, the caller is expected to have already confirmed this with
 * the person — this function doesn't ask again.
 */
export async function importSessionFile(file: File, mode: ImportMode): Promise<ImportSummary> {
  const text = await file.text()
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    throw new Error("That file isn't valid JSON — was it exported from this app?")
  }
  if (!isSessionExport(data)) {
    throw new Error("That doesn't look like a Travel Toolkit backup file.")
  }

  return mode === 'merge' ? mergeSession(data) : replaceSession(data)
}
