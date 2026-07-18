import { useRef, useState } from 'react'
import { type DiveCert, type DiveCertFieldInput, applyDiveCertEdit } from '../lib/diveCerts'
import { saveFile, deleteFile } from '../lib/fileVault'

interface Props {
  cert: DiveCert
  onSave: (updated: DiveCert) => void
  onCancel: () => void
}

export function DiveCertEditForm({ cert, onSave, onCancel }: Props) {
  const [agency, setAgency] = useState(cert.agency)
  const [level, setLevel] = useState(cert.level)
  const [certNumber, setCertNumber] = useState(cert.certNumber)
  const [issueDate, setIssueDate] = useState(cert.issueDate ?? '')
  const [instructorName, setInstructorName] = useState(cert.instructorName ?? '')
  const [notes, setNotes] = useState(cert.notes ?? '')
  const [newPhotoFile, setNewPhotoFile] = useState<File | null>(null)
  const [removePhoto, setRemovePhoto] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function handleSave() {
    if (!agency.trim() || !level.trim()) return
    setSaving(true)
    setSaveError(null)
    try {
      let photoFileId = cert.photoFileId
      if (newPhotoFile) {
        // Old photo is only deleted once the new one is safely saved — if
        // saveFile throws (e.g. a storage quota error), the existing photo
        // is still there rather than this having already thrown it away.
        const saved = await saveFile(newPhotoFile, `${agency} ${level} cert`, 'dive-cert')
        if (cert.photoFileId) await deleteFile(cert.photoFileId)
        photoFileId = saved.id
      } else if (removePhoto && cert.photoFileId) {
        await deleteFile(cert.photoFileId)
        photoFileId = undefined
      }
      const fields: DiveCertFieldInput = { agency, level, certNumber, issueDate, instructorName, notes }
      onSave(applyDiveCertEdit(cert, fields, photoFileId))
    } catch (e) {
      setSaveError((e as Error).message || 'Could not save — try again.')
      setSaving(false)
    }
  }

  return (
    <div className="space-y-2">
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

      {cert.photoFileId && !removePhoto && !newPhotoFile && (
        <div className="flex items-center justify-between text-xs">
          <span className="text-[var(--color-muted)]">Has a photo</span>
          <button type="button" onClick={() => setRemovePhoto(true)} className="text-[var(--color-amber)] underline">
            Remove photo
          </button>
        </div>
      )}
      {removePhoto && (
        <div className="flex items-center justify-between text-xs">
          <span className="text-[var(--color-muted)]">Photo will be removed</span>
          <button type="button" onClick={() => setRemovePhoto(false)} className="text-[var(--color-pine)] underline">
            Undo
          </button>
        </div>
      )}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={(e) => {
          setNewPhotoFile(e.target.files?.[0] ?? null)
          setRemovePhoto(false)
        }}
        className="w-full text-xs"
      />

      {saveError && <p className="text-xs text-[var(--color-danger)]">{saveError}</p>}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleSave}
          disabled={!agency.trim() || !level.trim() || saving}
          className="flex-1 rounded-lg bg-[var(--color-pine)] text-white px-3 py-2 text-sm disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className="flex-1 rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm disabled:opacity-50"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
