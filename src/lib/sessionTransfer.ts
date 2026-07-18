import { listFiles, putFile, clearAllFiles, type VaultFile } from './fileVault'

// Every setting this app writes uses this prefix (confirmed by grepping
// every localStorage.getItem/setItem call site) — scanning by prefix
// means a new setting added later is automatically included in exports
// without this file needing to know its key name.
const KEY_PREFIX = 'travel_'

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

/**
 * Fully replaces the app's current data with the contents of a backup
 * file — every existing travel_ setting and every vault file is cleared
 * first, then repopulated from the import. Deliberately a replace, not a
 * merge: a partial merge of two independent sets of flights/hotels/etc.
 * has no obviously "correct" resolution, while a clean replace always
 * lands in exactly the state the backup was taken in. The caller is
 * expected to have already confirmed this with the person — this
 * function doesn't ask again.
 */
export async function importSessionFile(file: File): Promise<{ settingsCount: number; filesCount: number }> {
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

  return { settingsCount: Object.keys(data.localStorage).length, filesCount: data.files.length }
}
