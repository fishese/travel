import { useSetting } from './useSetting'

export interface DiveCert {
  id: string
  agency: string // PADI, SSI, NAUI, etc.
  level: string // Open Water, Advanced, Rescue, Nitrox, etc.
  certNumber: string
  issueDate?: string // YYYY-MM-DD
  instructorName?: string
  photoFileId?: string // references lib/fileVault.ts VaultFile.id
  notes?: string
  savedAt: string
}

export function useSavedDiveCerts() {
  return useSetting<DiveCert[]>('travel_dive_certs', [])
}

function makeId() {
  return Math.random().toString(36).slice(2, 9)
}

export function newDiveCert(fields: {
  agency: string
  level: string
  certNumber: string
  issueDate?: string
  instructorName?: string
  photoFileId?: string
  notes?: string
}): DiveCert {
  return {
    id: makeId(),
    agency: fields.agency.trim(),
    level: fields.level.trim(),
    certNumber: fields.certNumber.trim(),
    issueDate: fields.issueDate || undefined,
    instructorName: fields.instructorName?.trim() || undefined,
    photoFileId: fields.photoFileId,
    notes: fields.notes?.trim() || undefined,
    savedAt: new Date().toISOString(),
  }
}
