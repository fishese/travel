import { useCallback, useEffect, useState } from 'react'
import { openDB, type DBSchema, type IDBPDatabase } from 'idb'

export type VaultCategory = 'flight' | 'hotel' | 'booking' | 'dive-cert' | 'other'

export interface VaultFile {
  id: string
  blob: Blob
  mimeType: string
  label: string
  category: VaultCategory
  linkedId?: string // e.g. a dive cert's id, if this file belongs to one
  savedAt: string
}

interface VaultSchema extends DBSchema {
  files: {
    key: string
    value: VaultFile
  }
}

let dbPromise: Promise<IDBPDatabase<VaultSchema>> | null = null

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB<VaultSchema>('travel-toolkit-vault', 1, {
      upgrade(db) {
        db.createObjectStore('files', { keyPath: 'id' })
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
  await db.put('files', record)
  return record
}

export async function getFile(id: string): Promise<VaultFile | undefined> {
  const db = await getDB()
  return db.get('files', id)
}

export async function listFiles(category?: VaultCategory): Promise<VaultFile[]> {
  const db = await getDB()
  const all = await db.getAll('files')
  return category ? all.filter((f) => f.category === category) : all
}

export async function deleteFile(id: string): Promise<void> {
  const db = await getDB()
  await db.delete('files', id)
}

/** Caller must URL.revokeObjectURL() this when done with it (e.g. a
 * useEffect cleanup) — otherwise the blob stays pinned in memory. */
export function fileObjectUrl(file: VaultFile): string {
  return URL.createObjectURL(file.blob)
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
