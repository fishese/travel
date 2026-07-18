import { useEffect, useState } from 'react'
import { type DiveCert } from '../lib/diveCerts'
import { getFile, fileObjectUrl, openVaultFile, type VaultFile } from '../lib/fileVault'
import { SwipeToDelete } from './SwipeToDelete'
import { requestOpen } from '../lib/swipeCoordinator'
import { ExpandableCard } from './ExpandableCard'
import { DiveCertEditForm } from './DiveCertEditForm'

function CertPhoto({ fileId }: { fileId: string }) {
  const [file, setFile] = useState<VaultFile | undefined>(undefined)
  const [url, setUrl] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    getFile(fileId).then((f) => {
      if (cancelled || !f) return
      setFile(f)
      setUrl(fileObjectUrl(f))
    })
    return () => {
      cancelled = true
    }
  }, [fileId])

  useEffect(() => {
    return () => {
      if (url) URL.revokeObjectURL(url)
    }
  }, [url])

  if (!url || !file) return null
  return (
    // object-contain (not -cover) so nothing is cropped out of the inline
    // preview, and tapping it opens the original file in a new tab at
    // full resolution — same click-to-open pattern as a Documents row.
    <button type="button" onClick={() => openVaultFile(file)} className="block w-full mt-2">
      <img
        src={url}
        alt="Certification card — tap to view full size"
        className="w-full rounded-lg max-h-64 object-contain bg-[var(--color-paper)]"
      />
    </button>
  )
}

interface Props {
  cert: DiveCert
  onDelete: (cert: DiveCert) => void
  onUpdate: (updated: DiveCert) => void
}

export function DiveCertCard({ cert, onDelete, onUpdate }: Props) {
  const [editing, setEditing] = useState(false)

  const header = (
    <div className="min-w-0">
      <p className="text-sm font-semibold truncate">
        {cert.agency} · {cert.level}
        {cert.certNumber && (
          <span className="text-xs font-normal text-[var(--color-muted)]"> — {cert.certNumber}</span>
        )}
      </p>
    </div>
  )

  return (
    <SwipeToDelete id={cert.id} label={`${cert.agency} ${cert.level}`} onDelete={() => onDelete(cert)}>
      <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <ExpandableCard header={header}>
              {editing ? (
                <DiveCertEditForm
                  cert={cert}
                  onSave={(updated) => {
                    onUpdate(updated)
                    setEditing(false)
                  }}
                  onCancel={() => setEditing(false)}
                />
              ) : (
                <>
                  {(cert.issueDate || cert.instructorName) && (
                    <p className="text-xs text-[var(--color-muted)]">
                      {[cert.issueDate, cert.instructorName].filter(Boolean).join(' · ')}
                    </p>
                  )}
                  {cert.notes && <p className="text-xs text-[var(--color-muted)]">{cert.notes}</p>}
                  {cert.photoFileId && <CertPhoto fileId={cert.photoFileId} />}
                  <button
                    type="button"
                    onClick={() => setEditing(true)}
                    className="text-xs text-[var(--color-pine)] underline mt-2"
                  >
                    Edit
                  </button>
                </>
              )}
            </ExpandableCard>
          </div>
          <button
            type="button"
            onClick={() => requestOpen(cert.id)}
            className="text-xs text-[var(--color-amber)] shrink-0"
          >
            Remove
          </button>
        </div>
      </div>
    </SwipeToDelete>
  )
}
