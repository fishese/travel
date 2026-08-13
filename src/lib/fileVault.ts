import { useCallback, useEffect, useState } from 'react'
import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import { decryptBlob, encryptBlob } from './deviceCrypto'

export type VaultCategory = 'flight' | 'hotel' | 'booking' | 'dive-cert' | 'itinerary' | 'other'

export interface VaultFile {
  id: string
  blob: Blob
  mimeType: string
  label: string
  category: VaultCategory
  linkedId?: string // e.g. a dive cert's id, if this file belongs to one
  savedAt: string
}

interface StoredVaultFile extends VaultFile {
  encrypted?: boolean
  iv?: Uint8Array
}

interface VaultSchema extends DBSchema {
  files: {
    key: string
    value: StoredVaultFile
  }
}

let dbPromise: Promise<IDBPDatabase<VaultSchema>> | null = null

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB<VaultSchema>('travel-toolkit-vault', 2, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('files')) db.createObjectStore('files', { keyPath: 'id' })
      },
    })
  }
  return dbPromise
}

function makeId() {
  return Math.random().toString(36).slice(2, 9)
}

export async function saveFile(
  file: File | Blob,
  label: string,
  category: VaultCategory,
  linkedId?: string,
): Promise<VaultFile> {
  const db = await getDB()
  const record: VaultFile = {
    id: makeId(),
    blob: file,
    mimeType: file.type || 'application/octet-stream',
    label,
    category,
    linkedId,
    savedAt: new Date().toISOString(),
  }
  const encrypted = await encryptBlob(file)
  await db.put('files', { ...record, blob: encrypted.blob, encrypted: true, iv: encrypted.iv })
  return record
}

async function readStoredFile(record: StoredVaultFile): Promise<VaultFile> {
  if (!record.encrypted || !record.iv) {
    // Files saved by pre-encryption versions are migrated lazily when first read.
    const encrypted = await encryptBlob(record.blob)
    const db = await getDB()
    await db.put('files', { ...record, blob: encrypted.blob, encrypted: true, iv: encrypted.iv })
    return { ...record, blob: record.blob }
  }
  const { encrypted: _encrypted, iv: _iv, ...plainRecord } = record
  return { ...plainRecord, blob: await decryptBlob(record.blob, record.iv, record.mimeType) }
}

export async function getFile(id: string): Promise<VaultFile | undefined> {
  const db = await getDB()
  const record = await db.get('files', id)
  return record ? readStoredFile(record) : undefined
}

export async function listFiles(category?: VaultCategory): Promise<VaultFile[]> {
  const db = await getDB()
  const all = await db.getAll('files')
  const filtered = category ? all.filter((f) => f.category === category) : all
  return Promise.all(filtered.map(readStoredFile))
}

export async function deleteFile(id: string): Promise<void> {
  const db = await getDB()
  await db.delete('files', id)
}

/** Writes a VaultFile record as-is, preserving its id — unlike saveFile,
 * which always mints a fresh id/timestamp for a genuinely new upload.
 * Used by session import to restore files with the exact same ids they
 * had at export time, since other saved data (a dive cert's photoFileId,
 * for instance) references those ids directly. */
export async function putFile(record: VaultFile): Promise<void> {
  const db = await getDB()
  const encrypted = await encryptBlob(record.blob)
  await db.put('files', { ...record, blob: encrypted.blob, encrypted: true, iv: encrypted.iv })
}

/** Replaces the vault in one IndexedDB transaction. Encryption is completed
 * before the transaction starts, so quota/decode failures cannot erase the
 * existing vault. */
export async function replaceAllFiles(records: VaultFile[]): Promise<void> {
  const encryptedRecords: StoredVaultFile[] = []
  for (const record of records) {
    const encrypted = await encryptBlob(record.blob)
    encryptedRecords.push({ ...record, blob: encrypted.blob, encrypted: true, iv: encrypted.iv })
  }
  const db = await getDB()
  const tx = db.transaction('files', 'readwrite')
  await tx.store.clear()
  for (const record of encryptedRecords) await tx.store.put(record)
  await tx.done
}

/** Wipes the entire vault — used by session import's "replace everything"
 * restore, right before repopulating it from the backup. */
export async function clearAllFiles(): Promise<void> {
  const db = await getDB()
  await db.clear('files')
}

/** Caller must URL.revokeObjectURL() this when done with it (e.g. a
 * useEffect cleanup) — otherwise the blob stays pinned in memory. */
export function fileObjectUrl(file: VaultFile): string {
  return URL.createObjectURL(file.blob)
}

/** Opens a vault file in a new tab. Deliberately not revoking the object
 * URL immediately — the new tab needs it to stay valid, and it'll be
 * cleaned up when that tab is closed/navigated away from. A minor,
 * bounded leak rather than a broken "open" action. */
export function openVaultFile(file: VaultFile): void {
  const url = fileObjectUrl(file)
  window.open(url, '_blank')
}

/** IndexedDB isn't reactive the way the localStorage-backed useSetting is —
 * this just re-fetches on demand. Call `refresh()` after any save/delete
 * that should be reflected. Fine for this app's scale (a handful of files
 * per trip, not a data-heavy list). */
export function useVaultFiles(category?: VaultCategory) {
  const [files, setFiles] = useState<VaultFile[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    setLoading(true)
    setFiles(await listFiles(category))
    setLoading(false)
  }, [category])

  useEffect(() => {
    refresh()
  }, [refresh])

  return { files, loading, refresh }
}
