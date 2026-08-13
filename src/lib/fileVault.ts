import { useCallback, useEffect, useState } from 'react'
import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import { VaultLockedError, getVaultKey, useVaultLock, type VaultKeyScope } from './vaultCrypto'

export type VaultCategory = 'flight' | 'hotel' | 'booking' | 'identity' | 'insurance' | 'dive-cert' | 'itinerary' | 'other'

export interface VaultFile {
  id: string
  tripId?: string
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
  keyScope?: VaultKeyScope
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
  tripId?: string,
): Promise<VaultFile> {
  const db = await getDB()
  const record: VaultFile = {
    id: makeId(),
    tripId,
    blob: file,
    mimeType: file.type || 'application/octet-stream',
    label,
    category,
    linkedId,
    savedAt: new Date().toISOString(),
  }
  const encrypted = await encryptBlob(file, category)
  await db.put('files', { ...record, blob: encrypted.blob, encrypted: true, iv: encrypted.iv, keyScope: encrypted.keyScope })
  return record
}

async function readStoredFile(record: StoredVaultFile): Promise<VaultFile> {
  if (!record.encrypted || !record.iv) {
    // Files saved by pre-encryption versions are migrated lazily when first read.
    const encrypted = await encryptBlob(record.blob, record.category)
    const db = await getDB()
    await db.put('files', { ...record, blob: encrypted.blob, encrypted: true, iv: encrypted.iv, keyScope: encrypted.keyScope })
    return { ...record, blob: record.blob }
  }
  const { encrypted: _encrypted, iv: _iv, keyScope: _keyScope, ...plainRecord } = record
  return { ...plainRecord, blob: await decryptBlob(record.blob, record.iv, record.mimeType, record.keyScope ?? 'vault') }
}

export async function getFile(id: string): Promise<VaultFile | undefined> {
  const db = await getDB()
  const record = await db.get('files', id)
  return record ? readStoredFile(record) : undefined
}

export async function listFiles(category?: VaultCategory, tripId?: string): Promise<VaultFile[]> {
  const db = await getDB()
  const all = await db.getAll('files')
  const filtered = all.filter((f) => (!category || f.category === category) && (!tripId || f.tripId === tripId))
  const readable = await Promise.all(
    filtered.map(async (file) => {
      try {
        return await readStoredFile(file)
      } catch (error) {
        // A password-locked file is omitted from mixed lists, allowing
        // intentionally device-only categories (booking/itinerary/dive cert)
        // to remain usable while protected files stay hidden.
        if (error instanceof VaultLockedError) return null
        throw error
      }
    }),
  )
  return readable.filter((file): file is VaultFile => file !== null)
}

export async function deleteFile(id: string): Promise<void> {
  const db = await getDB()
  await db.delete('files', id)
}

/** Changes non-content metadata without decrypting or re-encrypting the file.
 * This keeps assignment possible for a device-only booking/itinerary file
 * even while the password-protected vault is locked. */
export async function updateFileTrip(id: string, tripId: string | undefined): Promise<void> {
  const db = await getDB()
  const record = await db.get('files', id)
  if (!record) return
  await db.put('files', { ...record, tripId })
}

/** Writes a VaultFile record as-is, preserving its id — unlike saveFile,
 * which always mints a fresh id/timestamp for a genuinely new upload.
 * Used by session import to restore files with the exact same ids they
 * had at export time, since other saved data (a dive cert's photoFileId,
 * for instance) references those ids directly. */
export async function putFile(record: VaultFile): Promise<void> {
  const db = await getDB()
  const encrypted = await encryptBlob(record.blob, record.category)
  await db.put('files', { ...record, blob: encrypted.blob, encrypted: true, iv: encrypted.iv, keyScope: encrypted.keyScope })
}

/** Replaces the vault in one IndexedDB transaction. Encryption is completed
 * before the transaction starts, so quota/decode failures cannot erase the
 * existing vault. */
export async function replaceAllFiles(records: VaultFile[]): Promise<void> {
  const encryptedRecords: StoredVaultFile[] = []
  for (const record of records) {
    const encrypted = await encryptBlob(record.blob, record.category)
    encryptedRecords.push({ ...record, blob: encrypted.blob, encrypted: true, iv: encrypted.iv, keyScope: encrypted.keyScope })
  }
  const db = await getDB()
  const tx = db.transaction('files', 'readwrite')
  await tx.store.clear()
  for (const record of encryptedRecords) await tx.store.put(record)
  await tx.done
}

function keyScopeForCategory(category?: VaultCategory): VaultKeyScope {
  return category === 'dive-cert' || category === 'itinerary' || category === 'booking' ? 'device' : 'vault'
}

function isDeviceScopedCategory(category: VaultCategory): boolean {
  return keyScopeForCategory(category) === 'device'
}

/** Re-encrypts reference-only files when the vault password changes. The
 * source key is the old device/vault key; the target is the device-only public
 * key (or the unwrapped vault key when removing the password). */
export async function migrateDeviceScopedFiles(sourceKey: CryptoKey, targetKey: CryptoKey): Promise<void> {
  const db = await getDB()
  const records = await db.getAll('files')
  const publicKey = await getVaultKey('device')
  const tx = db.transaction('files', 'readwrite')
  for (const record of records) {
    if (!isDeviceScopedCategory(record.category)) continue
    let plaintext: ArrayBuffer
    if (!record.encrypted || !record.iv) {
      plaintext = await record.blob.arrayBuffer()
    } else {
      const ciphertext = await record.blob.arrayBuffer()
      const iv = { name: 'AES-GCM', iv: Uint8Array.from(record.iv).buffer as ArrayBuffer }
      try {
        plaintext = await crypto.subtle.decrypt(iv, sourceKey, ciphertext)
      } catch {
        // Files written by an earlier version may already be tagged as
        // device-scoped but still use the previous device key.
        plaintext = await crypto.subtle.decrypt(iv, publicKey, ciphertext)
      }
    }
    const iv = crypto.getRandomValues(new Uint8Array(12))
    const ciphertext = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: Uint8Array.from(iv).buffer as ArrayBuffer },
      targetKey,
      plaintext,
    )
    await tx.store.put({ ...record, blob: new Blob([ciphertext], { type: 'application/octet-stream' }), encrypted: true, iv, keyScope: 'device' })
  }
  await tx.done
}

async function encryptBlob(blob: Blob, category?: VaultCategory): Promise<{ blob: Blob; iv: Uint8Array; keyScope: VaultKeyScope }> {
  const keyScope = keyScopeForCategory(category)
  const key = await getVaultKey(keyScope)
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: Uint8Array.from(iv).buffer as ArrayBuffer }, key, await blob.arrayBuffer())
  return { blob: new Blob([ciphertext], { type: 'application/octet-stream' }), iv, keyScope }
}

async function decryptBlob(blob: Blob, iv: Uint8Array, mimeType: string, keyScope: VaultKeyScope): Promise<Blob> {
  const key = await getVaultKey(keyScope)
  const plaintext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: Uint8Array.from(iv).buffer as ArrayBuffer }, key, await blob.arrayBuffer())
  return new Blob([plaintext], { type: mimeType })
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
export function useVaultFiles(category?: VaultCategory, tripId?: string) {
  const [files, setFiles] = useState<VaultFile[]>([])
  const [loading, setLoading] = useState(true)
  const [locked, setLocked] = useState(false)
  const vault = useVaultLock()

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      setFiles(await listFiles(category, tripId))
      setLocked(vault.status === 'locked')
    } catch (error) {
      if (error instanceof VaultLockedError) {
        setFiles([])
        setLocked(true)
      } else throw error
    } finally {
      setLoading(false)
    }
  }, [category, tripId, vault.status])

  useEffect(() => {
    refresh()
  }, [refresh])

  return { files, loading, locked, refresh }
}
