import { useEffect, useState } from 'react'
import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import { clearDeviceEncryptionKey, getDeviceEncryptionKey, getPublicEncryptionKey, storeDeviceEncryptionKey } from './deviceCrypto'
import { migrateDeviceScopedFiles } from './fileVault'

interface VaultMeta {
  id: 'config'
  mode: 'password'
  saltBase64: string
  ivBase64: string
  wrappedKeyBase64: string
}

interface MetaSchema extends DBSchema {
  config: { key: string; value: VaultMeta }
}

export type VaultKeyScope = 'device' | 'vault'

let dbPromise: Promise<IDBPDatabase<MetaSchema>> | null = null
let activeKey: CryptoKey | null = null
const listeners = new Set<() => void>()

export class VaultLockedError extends Error {
  constructor() {
    super('The vault is locked. Unlock it to view or change protected files.')
    this.name = 'VaultLockedError'
  }
}

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB<MetaSchema>('travel-toolkit-vault-meta', 1, {
      upgrade(db) {
        db.createObjectStore('config', { keyPath: 'id' })
      },
    })
  }
  return dbPromise
}

function notify() {
  listeners.forEach((listener) => listener())
}

function toBase64(bytes: Uint8Array): string {
  let binary = ''
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return btoa(binary)
}

function fromBase64(value: string): Uint8Array {
  const binary = atob(value)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

function ensureSubtle() {
  if (!globalThis.crypto?.subtle) throw new Error('This browser does not support a protected vault.')
  return globalThis.crypto.subtle
}

async function derivePasswordKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const subtle = ensureSubtle()
  const material = await subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveKey'])
  return subtle.deriveKey(
    { name: 'PBKDF2', salt: Uint8Array.from(salt).buffer as ArrayBuffer, iterations: 210_000, hash: 'SHA-256' },
    material,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  )
}

async function exportRaw(key: CryptoKey): Promise<Uint8Array> {
  return new Uint8Array(await ensureSubtle().exportKey('raw', key))
}

async function importRaw(bytes: Uint8Array): Promise<CryptoKey> {
  return ensureSubtle().importKey('raw', Uint8Array.from(bytes).buffer as ArrayBuffer, { name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt'])
}

async function getMeta(): Promise<VaultMeta | undefined> {
  return (await getDB()).get('config', 'config')
}

export async function vaultHasPassword(): Promise<boolean> {
  return (await getMeta())?.mode === 'password'
}

export async function getVaultKey(scope: VaultKeyScope = 'vault'): Promise<CryptoKey> {
  if (scope === 'device') return getPublicEncryptionKey()
  if (activeKey) return activeKey
  const meta = await getMeta()
  if (!meta) {
    activeKey = await getDeviceEncryptionKey()
    return activeKey
  }
  throw new VaultLockedError()
}

export async function unlockVault(password: string): Promise<void> {
  const meta = await getMeta()
  if (!meta) return
  if (!password) throw new Error('Enter the vault password.')
  try {
    const key = await derivePasswordKey(password, fromBase64(meta.saltBase64))
    const raw = await ensureSubtle().decrypt(
      { name: 'AES-GCM', iv: Uint8Array.from(fromBase64(meta.ivBase64)).buffer as ArrayBuffer },
      key,
      Uint8Array.from(fromBase64(meta.wrappedKeyBase64)).buffer as ArrayBuffer,
    )
    activeKey = await importRaw(new Uint8Array(raw))
  } catch {
    throw new Error('Could not unlock the vault. Check the password and try again.')
  }
  const unlockedKey = activeKey
  // Itineraries/booking docs/dive-cert photos used to be wrapped with the
  // vault password. Re-encrypt them onto the device key now that we have
  // the vault key, so they stay readable after the next lock.
  if (unlockedKey) {
    try {
      await migrateDeviceScopedFiles(unlockedKey, await getPublicEncryptionKey())
    } catch {
      // Unlock still succeeded; lists will retry decrypt on the next refresh.
    }
  }
  notify()
}

export function lockVault() {
  activeKey = null
  notify()
}

export async function setVaultPassword(password: string): Promise<void> {
  if (!password) throw new Error('Enter a password.')
  const current = await getVaultKey()
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const wrappingKey = await derivePasswordKey(password, salt)
  const wrapped = await ensureSubtle().encrypt(
    { name: 'AES-GCM', iv: Uint8Array.from(iv).buffer as ArrayBuffer },
    wrappingKey,
    Uint8Array.from(await exportRaw(current)).buffer as ArrayBuffer,
  )
  await (await getDB()).put('config', {
    id: 'config',
    mode: 'password',
    saltBase64: toBase64(salt),
    ivBase64: toBase64(iv),
    wrappedKeyBase64: toBase64(new Uint8Array(wrapped)),
  })
  const publicKey = await getPublicEncryptionKey()
  await migrateDeviceScopedFiles(current, publicKey)
  activeKey = current
  await clearDeviceEncryptionKey()
  notify()
}

export async function removeVaultPassword(): Promise<void> {
  const current = await getVaultKey()
  const publicKey = await getPublicEncryptionKey()
  await migrateDeviceScopedFiles(current, publicKey)
  await storeDeviceEncryptionKey(current)
  await (await getDB()).delete('config', 'config')
  activeKey = current
  notify()
}

export function useVaultLock() {
  const [status, setStatus] = useState<'loading' | 'locked' | 'unlocked'>('loading')
  const [hasPassword, setHasPassword] = useState(false)

  useEffect(() => {
    const refresh = () => {
      void vaultHasPassword().then((password) => {
        setHasPassword(password)
        setStatus(password && !activeKey ? 'locked' : 'unlocked')
      })
    }
    const listener = () => refresh()
    listeners.add(listener)
    refresh()
    return () => {
      listeners.delete(listener)
    }
  }, [])

  return { status, locked: status === 'locked', hasPassword, unlock: unlockVault, lock: lockVault, setPassword: setVaultPassword, removePassword: removeVaultPassword }
}
