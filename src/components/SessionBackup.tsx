import { useRef, useState } from 'react'
import { downloadSessionExport, importSessionFile } from '../lib/sessionTransfer'
import { hapticConfirm } from '../lib/haptics'

type Status =
  | { kind: 'idle' }
  | { kind: 'confirming'; file: File }
  | { kind: 'working' }
  | { kind: 'exported'; settingsCount: number; filesCount: number }
  | { kind: 'imported'; settingsCount: number; filesCount: number }
  | { kind: 'error'; message: string }

export function SessionBackup() {
  const [open, setOpen] = useState(false)
  const [status, setStatus] = useState<Status>({ kind: 'idle' })
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function handleExport() {
    setStatus({ kind: 'working' })
    try {
      const { settingsCount, filesCount } = await downloadSessionExport()
      setStatus({ kind: 'exported', settingsCount, filesCount })
    } catch (e) {
      setStatus({ kind: 'error', message: (e as Error).message })
    }
  }

  function handleFilePicked(file: File | undefined) {
    if (!file) return
    setStatus({ kind: 'confirming', file })
  }

  async function handleConfirmImport(file: File) {
    setStatus({ kind: 'working' })
    try {
      const { settingsCount, filesCount } = await importSessionFile(file)
      hapticConfirm()
      setStatus({ kind: 'imported', settingsCount, filesCount })
      // A full reload is deliberate here rather than trying to nudge every
      // useSetting hook and the file vault's useVaultFiles into re-reading
      // — this touches essentially all of the app's state at once, and a
      // clean reload is the only way to be sure nothing is left showing a
      // stale in-memory value after a restore.
      setTimeout(() => window.location.reload(), 1200)
    } catch (e) {
      setStatus({ kind: 'error', message: (e as Error).message })
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  if (!open) {
    return (
      <div className="mt-4 mb-2 text-center">
        <button type="button" onClick={() => setOpen(true)} className="text-xs text-[var(--color-muted)] underline">
          Backup & restore
        </button>
      </div>
    )
  }

  return (
    <section className="mt-4 mb-2 rounded-xl border border-[var(--color-border)] p-3">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-sm font-semibold">Backup & restore</h2>
        <button
          type="button"
          onClick={() => {
            setOpen(false)
            setStatus({ kind: 'idle' })
          }}
          disabled={status.kind === 'working'}
          className="text-xs text-[var(--color-muted)] underline disabled:opacity-40"
        >
          Close
        </button>
      </div>

      <p className="text-xs text-[var(--color-muted)] mb-2">
        Everything saved in this app — flights, hotels, bookings, dive certs, documents, settings — as one file you
        can keep somewhere safe or move to another device.
      </p>

      <button
        type="button"
        onClick={handleExport}
        disabled={status.kind === 'working'}
        className="w-full rounded-lg bg-[var(--color-pine)] text-white px-3 py-2 text-sm disabled:opacity-50"
      >
        Export backup
      </button>

      <div className="mt-2">
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json"
          onChange={(e) => handleFilePicked(e.target.files?.[0])}
          disabled={status.kind === 'working'}
          className="w-full text-xs disabled:opacity-40"
        />
      </div>

      {status.kind === 'confirming' && (
        <div className="mt-2 rounded-lg border border-[var(--color-danger)] bg-[var(--color-danger-dim)] p-2">
          <p className="text-xs mb-2">
            This replaces <strong>everything</strong> currently saved in this app with the contents of{' '}
            <span className="font-medium">{status.file.name}</span>. This can't be undone.
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => handleConfirmImport(status.file)}
              className="flex-1 rounded-lg bg-[var(--color-danger)] text-white px-3 py-2 text-xs"
            >
              Replace everything
            </button>
            <button
              type="button"
              onClick={() => {
                setStatus({ kind: 'idle' })
                if (fileInputRef.current) fileInputRef.current.value = ''
              }}
              className="flex-1 rounded-lg border border-[var(--color-border)] px-3 py-2 text-xs"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {status.kind === 'working' && <p className="text-xs text-[var(--color-muted)] mt-2">Working…</p>}

      {status.kind === 'exported' && (
        <p className="text-xs text-[var(--color-pine)] mt-2">
          Downloaded — {status.settingsCount} settings and {status.filesCount} file
          {status.filesCount === 1 ? '' : 's'}.
        </p>
      )}

      {status.kind === 'imported' && (
        <p className="text-xs text-[var(--color-pine)] mt-2">
          Restored {status.settingsCount} settings and {status.filesCount} file
          {status.filesCount === 1 ? '' : 's'} — reloading…
        </p>
      )}

      {status.kind === 'error' && <p className="text-xs text-[var(--color-danger)] mt-2">{status.message}</p>}
    </section>
  )
}
