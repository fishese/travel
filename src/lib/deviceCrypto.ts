import { openDB, type DBSchema, type IDBPDatabase } from 'idb'

interface DeviceKeySchema extends DBSchema {
  keys: { key: string; value: { id: string; key: CryptoKey } }
}

let dbPromise: Promise<IDBPDatabase<DeviceKeySchema>> | null = null
let deviceKeyPromise: Promise<CryptoKey> | null = null

function getKeyDb() {
  if (!dbPromise) {
    dbPromise = openDB<DeviceKeySchema>('travel-toolkit-device-key', 1, {
      upgrade(db) {
        db.createObjectStore('keys', { keyPath: 'id' })
      },
    })
  }
  return dbPromise
}

export function deviceEncryptionAvailable(): boolean {
  return Boolean(globalThis.crypto?.subtle)
}

export async function getDeviceEncryptionKey(): Promise<CryptoKey> {
  if (!deviceKeyPromise) {
    deviceKeyPromise = (async () => {
      if (!deviceEncryptionAvailable()) throw new Error('This browser does not support encrypted local documents.')
      const db = await getKeyDb()
      const stored = await db.get('keys', 'device')
      if (stored) return stored.key
      const key = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt'])
      await db.put('keys', { id: 'device', key })
      return key
    })()
  }
  return deviceKeyPromise
}

export async function getPublicEncryptionKey(): Promise<CryptoKey> {
  if (!deviceEncryptionAvailable()) throw new Error('This browser does not support encrypted local documents.')
  const db = await getKeyDb()
  const stored = await db.get('keys', 'public')
  if (stored) return stored.key
  const key = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt'])
  await db.put('keys', { id: 'public', key })
  return key
}

export async function storeDeviceEncryptionKey(key: CryptoKey): Promise<void> {
  const db = await getKeyDb()
  await db.put('keys', { id: 'device', key })
  deviceKeyPromise = Promise.resolve(key)
}

export async function clearDeviceEncryptionKey(): Promise<void> {
  const db = await getKeyDb()
  await db.delete('keys', 'device')
  deviceKeyPromise = null
}

export async function encryptBlob(blob: Blob): Promise<{ blob: Blob; iv: Uint8Array }> {
  const key = await getDeviceEncryptionKey()
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: Uint8Array.from(iv).buffer as ArrayBuffer }, key, await blob.arrayBuffer())
  return { blob: new Blob([ciphertext], { type: 'application/octet-stream' }), iv }
}

export async function decryptBlob(blob: Blob, iv: Uint8Array, mimeType: string): Promise<Blob> {
  const key = await getDeviceEncryptionKey()
  const plaintext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: Uint8Array.from(iv).buffer as ArrayBuffer }, key, await blob.arrayBuffer())
  return new Blob([plaintext], { type: mimeType })
}
