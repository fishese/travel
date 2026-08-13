const BACKUP_VERSION = 2
const PBKDF2_ITERATIONS = 210_000

export interface EncryptedBackupEnvelope {
  format: 'travel-toolkit-backup'
  version: 2
  encrypted: true
  algorithm: 'AES-GCM'
  kdf: 'PBKDF2-SHA-256'
  iterations: number
  saltBase64: string
  ivBase64: string
  ciphertextBase64: string
}

function ensureCrypto() {
  if (!globalThis.crypto?.subtle) throw new Error('This browser does not support encrypted backups.')
  return globalThis.crypto.subtle
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

async function deriveKey(password: string, salt: Uint8Array, iterations: number): Promise<CryptoKey> {
  const subtle = ensureCrypto()
  const material = await subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveKey'])
  return subtle.deriveKey(
    { name: 'PBKDF2', salt: Uint8Array.from(salt).buffer as ArrayBuffer, iterations, hash: 'SHA-256' },
    material,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  )
}

export async function encryptBackupText(text: string, password: string): Promise<EncryptedBackupEnvelope> {
  if (!password) throw new Error('Enter a password or leave it blank for an unencrypted backup.')
  const subtle = ensureCrypto()
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const key = await deriveKey(password, salt, PBKDF2_ITERATIONS)
  const encrypted = await subtle.encrypt({ name: 'AES-GCM', iv: Uint8Array.from(iv).buffer as ArrayBuffer }, key, new TextEncoder().encode(text))
  return {
    format: 'travel-toolkit-backup',
    version: BACKUP_VERSION,
    encrypted: true,
    algorithm: 'AES-GCM',
    kdf: 'PBKDF2-SHA-256',
    iterations: PBKDF2_ITERATIONS,
    saltBase64: toBase64(salt),
    ivBase64: toBase64(iv),
    ciphertextBase64: toBase64(new Uint8Array(encrypted)),
  }
}

export function isEncryptedBackup(value: unknown): value is EncryptedBackupEnvelope {
  if (!value || typeof value !== 'object') return false
  const data = value as Record<string, unknown>
  return data.format === 'travel-toolkit-backup' && data.version === 2 && data.encrypted === true
}

export async function decryptBackupEnvelope(envelope: EncryptedBackupEnvelope, password: string): Promise<string> {
  if (!password) throw new Error('This backup is password-protected.')
  const subtle = ensureCrypto()
  try {
    const salt = fromBase64(envelope.saltBase64)
    const iv = fromBase64(envelope.ivBase64)
    const key = await deriveKey(password, salt, envelope.iterations)
    const plain = await subtle.decrypt({ name: 'AES-GCM', iv: Uint8Array.from(iv).buffer as ArrayBuffer }, key, Uint8Array.from(fromBase64(envelope.ciphertextBase64)).buffer as ArrayBuffer)
    return new TextDecoder().decode(plain)
  } catch {
    throw new Error('Could not decrypt the backup. Check the password and try again.')
  }
}
