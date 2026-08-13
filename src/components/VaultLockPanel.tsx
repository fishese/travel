import { useState } from 'react'
import { useVaultLock } from '../lib/vaultCrypto'

export function VaultLockPanel() {
  const vault = useVaultLock()
  const [password, setPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [working, setWorking] = useState(false)

  async function unlock() {
    setWorking(true)
    setError(null)
    try {
      await vault.unlock(password)
      setPassword('')
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setWorking(false)
    }
  }

  async function setPasswordAction() {
    if (newPassword.length < 8) {
      setError('Use at least 8 characters for a vault password.')
      return
    }
    setWorking(true)
    setError(null)
    try {
      await vault.setPassword(newPassword)
      setNewPassword('')
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setWorking(false)
    }
  }

  async function removePassword() {
    if (!window.confirm('Remove the vault password? Files will remain encrypted on this device, but the vault will unlock automatically.')) return
    setWorking(true)
    setError(null)
    try {
      await vault.removePassword()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setWorking(false)
    }
  }

  if (vault.status === 'loading') return <p className="text-xs text-[var(--color-muted)]">Checking vault…</p>

  if (vault.locked) {
    return (
      <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-3 space-y-2">
        <p className="text-sm font-semibold">🔒 Vault locked</p>
        <p className="text-xs text-[var(--color-muted)]">Passport copies, insurance, visas and other protected files are hidden. Currency, trips and planner records still work.</p>
        <div className="flex gap-2">
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && unlock()} placeholder="Vault password" className="flex-1 min-w-0 rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm" />
          <button type="button" onClick={unlock} disabled={working || !password} className="rounded-lg bg-[var(--color-pine)] text-white px-3 py-2 text-sm disabled:opacity-50">Unlock</button>
        </div>
        {error && <p className="text-xs text-[var(--color-danger)]">{error}</p>}
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-3 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div><p className="text-sm font-semibold">🔓 Protected vault</p><p className="text-xs text-[var(--color-muted)]">The rest of the app does not require this password.</p></div>
        {vault.hasPassword && <button type="button" onClick={vault.lock} disabled={working} className="text-xs text-[var(--color-pine)] underline">Lock now</button>}
      </div>
      {!vault.hasPassword ? (
        <div className="flex gap-2">
          <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Set vault password (8+ chars)" className="flex-1 min-w-0 rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm" />
          <button type="button" onClick={setPasswordAction} disabled={working || !newPassword} className="rounded-lg bg-[var(--color-pine)] text-white px-3 py-2 text-sm disabled:opacity-50">Protect</button>
        </div>
      ) : (
        <button type="button" onClick={removePassword} disabled={working} className="text-xs text-[var(--color-danger)] underline">Remove vault password</button>
      )}
      {error && <p className="text-xs text-[var(--color-danger)]">{error}</p>}
    </div>
  )
}

