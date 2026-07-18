import { useRef, useState } from 'react'
import { downloadSessionExport, importSessionFile, type ImportMode } from '../lib/sessionTransfer'
import { hapticConfirm } from '../lib/haptics'

type Status =
  | { kind: 'idle' }
  | { kind: 'confirming'; file: File }
  | { kind: 'working' }
  | { kind: 'exported'; settingsCount: number; filesCount: number }
  | { kind: 'imported'; message: string }
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

  async function handleConfirmImport(file: File, mode: ImportMode) {
    setStatus({ kind: 'working' })
    try {
      const summary = await importSessionFile(file, mode)
      hapticConfirm()
      const message =
        summary.mode === 'replace'
          ? `Restored ${summary.settingsCount} settings and ${summary.filesCount} file${summary.filesCount === 1 ? '' : 's'}.`
          : `Added ${summary.added.flights} flight${summary.added.flights === 1 ? '' : 's'}, ${summary.added.hotels} hotel${summary.added.hotels === 1 ? '' : 's'}, ${summary.added.bookings} booking${summary.added.bookings === 1 ? '' : 's'}, ${summary.added['dive certs']} dive cert${summary.added['dive certs'] === 1 ? '' : 's'}, and ${summary.added.files} file${summary.added.files === 1 ? '' : 's'}. Everything else on this device was left as-is.`
      setStatus({ kind: 'imported', message })
      // A full reload keeps this simple and reliably consistent — merge
      // already updates settings live (see writeSettingExternally), but
      // the file vault (dive cert photos, documents) has no equivalent
      // live-update path, so newly merged files wouldn't show up anywhere
      // already mounted without one anyway. Reloading covers both modes
      // the same way rather than having merge and replace behave
      // differently here.
      setTimeout(() => window.location.reload(), 1600)
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
        <div className="mt-2 rounded-lg border border-[var(--color-border)] p-2 space-y-2">
          <p className="text-xs">
            Importing <span className="font-medium">{status.file.name}</span>. Choose how:
          </p>

          <div>
            <button
              type="button"
              onClick={() => handleConfirmImport(status.file, 'merge')}
              className="w-full rounded-lg bg-[var(--color-pine)] text-white px-3 py-2 text-xs"
            >
              Merge — add what's new
            </button>
            <p className="text-xs text-[var(--color-muted)] mt-1">
              Adds any flights/hotels/bookings/dive certs/documents from the file that aren't already here. Nothing
              is removed; settings on this device are left as-is.
            </p>
          </div>

          <div>
            <button
              type="button"
              onClick={() => handleConfirmImport(status.file, 'replace')}
              className="w-full rounded-lg bg-[var(--color-danger)] text-white px-3 py-2 text-xs"
            >
              Replace everything
            </button>
            <p className="text-xs text-[var(--color-muted)] mt-1">
              Wipes everything currently saved in this app and replaces it with the file's contents. Can't be undone.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              setStatus({ kind: 'idle' })
              if (fileInputRef.current) fileInputRef.current.value = ''
            }}
            className="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-xs"
          >
            Cancel
          </button>
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
        <p className="text-xs text-[var(--color-pine)] mt-2">{status.message} Reloading…</p>
      )}

      {status.kind === 'error' && <p className="text-xs text-[var(--color-danger)] mt-2">{status.message}</p>}
    </section>
  )
}
