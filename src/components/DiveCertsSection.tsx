import { useRef, useState } from 'react'
import { useSavedDiveCerts, newDiveCert, type DiveCert } from '../lib/diveCerts'
import { saveFile, deleteFile } from '../lib/fileVault'
import { Collapsible } from './Collapsible'
import { AddFormToggle } from './AddFormToggle'
import { DiveCertCard } from './DiveCertCard'

interface Props {
  onMoveUp?: () => void
  onMoveDown?: () => void
}

export function DiveCertsSection({ onMoveUp, onMoveDown }: Props) {
  const [certs, setCerts] = useSavedDiveCerts()

  const [agency, setAgency] = useState('')
  const [level, setLevel] = useState('')
  const [certNumber, setCertNumber] = useState('')
  const [issueDate, setIssueDate] = useState('')
  const [instructorName, setInstructorName] = useState('')
  const [notes, setNotes] = useState('')
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [showAddForm, setShowAddForm] = useState(() => certs.length === 0)

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
    setShowAddForm(false)
  }

  async function removeCert(cert: DiveCert) {
    if (cert.photoFileId) await deleteFile(cert.photoFileId)
    setCerts((prev) => prev.filter((c) => c.id !== cert.id))
  }

  function updateCert(updated: DiveCert) {
    setCerts((prev) => prev.map((c) => (c.id === updated.id ? updated : c)))
  }

  return (
    <Collapsible id="dive-certs" title="Dive certs" onMoveUp={onMoveUp} onMoveDown={onMoveDown}>
      <p className="text-xs text-[var(--color-muted)] mb-2">
        Offline-accessible proof of certification for dive shops/liveaboards — useful with no signal.
      </p>

      <AddFormToggle label="Add dive cert" open={showAddForm} onOpenChange={setShowAddForm}>
        <div className="flex flex-wrap gap-2">
          <input
            value={agency}
            onChange={(e) => setAgency(e.target.value)}
            placeholder="Agency (PADI, SSI…)"
            className="flex-1 min-w-0 rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm"
          />
          <input
            value={level}
            onChange={(e) => setLevel(e.target.value)}
            placeholder="Level (Open Water…)"
            className="flex-1 min-w-0 rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm"
          />
        </div>
        <input
          value={certNumber}
          onChange={(e) => setCertNumber(e.target.value)}
          placeholder="Cert number"
          className="w-full rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm"
        />
        <div className="flex flex-wrap gap-2">
          <input
            type="date"
            value={issueDate}
            onChange={(e) => setIssueDate(e.target.value)}
            className="flex-1 min-w-0 rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm"
          />
          <input
            value={instructorName}
            onChange={(e) => setInstructorName(e.target.value)}
            placeholder="Instructor (optional)"
            className="flex-1 min-w-0 rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm"
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
      </AddFormToggle>

      {certs.length === 0 ? (
        <p className="text-sm text-[var(--color-muted)]">No certs saved yet.</p>
      ) : (
        <div className="space-y-2">
          {certs.map((c) => (
            <DiveCertCard key={c.id} cert={c} onDelete={removeCert} onUpdate={updateCert} />
          ))}
        </div>
      )}
    </Collapsible>
  )
}
