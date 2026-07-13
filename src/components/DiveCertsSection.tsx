import { useEffect, useRef, useState } from 'react'
import { useSavedDiveCerts, newDiveCert, type DiveCert } from '../lib/diveCerts'
import { saveFile, getFile, deleteFile, fileObjectUrl, type VaultFile } from '../lib/fileVault'
import { Collapsible } from './Collapsible'

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
  return <img src={url} alt="Certification card" className="w-full rounded-lg mt-2 max-h-40 object-cover" />
}

export function DiveCertsSection() {
  const [certs, setCerts] = useSavedDiveCerts()

  const [agency, setAgency] = useState('')
  const [level, setLevel] = useState('')
  const [certNumber, setCertNumber] = useState('')
  const [issueDate, setIssueDate] = useState('')
  const [instructorName, setInstructorName] = useState('')
  const [notes, setNotes] = useState('')
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function addCert() {
    if (!agency.trim() || !level.trim()) return
    let photoFileId: string | undefined
    if (photoFile) {
      const saved = await saveFile(photoFile, `${agency} ${level} cert`, 'dive-cert')
      photoFileId = saved.id
    }
    setCerts((prev) => [
      ...prev,
      newDiveCert({ agency, level, certNumber, issueDate, instructorName, notes, photoFileId }),
    ])
    setAgency('')
    setLevel('')
    setCertNumber('')
    setIssueDate('')
    setInstructorName('')
    setNotes('')
    setPhotoFile(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function removeCert(cert: DiveCert) {
    if (cert.photoFileId) await deleteFile(cert.photoFileId)
    setCerts((prev) => prev.filter((c) => c.id !== cert.id))
  }

  return (
    <Collapsible title="Dive certs">
      <p className="text-xs text-[var(--color-muted)] mb-2">
        Offline-accessible proof of certification for dive shops/liveaboards — useful with no signal.
      </p>

      <div className="space-y-2 mb-2 pb-2 border-b border-dashed border-[var(--color-border)]">
        <div className="flex gap-2">
          <input
            value={agency}
            onChange={(e) => setAgency(e.target.value)}
            placeholder="Agency (PADI, SSI…)"
            className="flex-1 rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm"
          />
          <input
            value={level}
            onChange={(e) => setLevel(e.target.value)}
            placeholder="Level (Open Water…)"
            className="flex-1 rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm"
          />
        </div>
        <input
          value={certNumber}
          onChange={(e) => setCertNumber(e.target.value)}
          placeholder="Cert number"
          className="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm"
        />
        <div className="flex gap-2">
          <input
            type="date"
            value={issueDate}
            onChange={(e) => setIssueDate(e.target.value)}
            className="flex-1 rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm"
          />
          <input
            value={instructorName}
            onChange={(e) => setInstructorName(e.target.value)}
            placeholder="Instructor (optional)"
            className="flex-1 rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm"
          />
        </div>
        <input
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Notes (optional)"
          className="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm"
        />
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={(e) => setPhotoFile(e.target.files?.[0] ?? null)}
          className="w-full text-xs"
        />
        <button
          type="button"
          onClick={addCert}
          disabled={!agency.trim() || !level.trim()}
          className="w-full rounded-lg bg-[var(--color-pine)] text-white px-3 py-2 text-sm disabled:opacity-50"
        >
          Save cert
        </button>
      </div>

      {certs.length === 0 ? (
        <p className="text-sm text-[var(--color-muted)]">No certs saved yet.</p>
      ) : (
        <div className="space-y-2">
          {certs.map((c) => (
            <div key={c.id} className="rounded-lg border border-[var(--color-border)] p-2">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-semibold truncate">
                    {c.agency} · {c.level}
                  </p>
                  <p className="text-xs text-[var(--color-muted)] truncate">
                    {[c.certNumber, c.issueDate, c.instructorName].filter(Boolean).join(' · ')}
                  </p>
                  {c.notes && <p className="text-xs text-[var(--color-muted)] truncate">{c.notes}</p>}
                </div>
                <button
                  type="button"
                  onClick={() => removeCert(c)}
                  className="text-xs text-[var(--color-amber)] shrink-0"
                >
                  Remove
                </button>
              </div>
              {c.photoFileId && <CertPhoto fileId={c.photoFileId} />}
            </div>
          ))}
        </div>
      )}
    </Collapsible>
  )
}
