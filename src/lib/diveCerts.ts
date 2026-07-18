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

// Stable module-level reference — see hotels.ts / useSetting.ts for why a
// fresh `[]` literal here would defeat the setter/getSnapshot memoization.
const EMPTY_DIVE_CERTS: DiveCert[] = []

export function useSavedDiveCerts() {
  return useSetting<DiveCert[]>('travel_dive_certs', EMPTY_DIVE_CERTS)
}

function makeId() {
  return Math.random().toString(36).slice(2, 9)
}

export interface DiveCertFieldInput {
  agency: string
  level: string
  certNumber: string
  issueDate?: string
  instructorName?: string
  notes?: string
}

function normalizeDiveCertFields(fields: DiveCertFieldInput) {
  return {
    agency: fields.agency.trim(),
    level: fields.level.trim(),
    certNumber: fields.certNumber.trim(),
    issueDate: fields.issueDate || undefined,
    instructorName: fields.instructorName?.trim() || undefined,
    notes: fields.notes?.trim() || undefined,
  }
}

export function newDiveCert(fields: DiveCertFieldInput & { photoFileId?: string }): DiveCert {
  return {
    id: makeId(),
    ...normalizeDiveCertFields(fields),
    photoFileId: fields.photoFileId,
    savedAt: new Date().toISOString(),
  }
}

/** Applies an edit to an existing cert — same field normalization as
 * newDiveCert, keeping id/savedAt untouched. photoFileId is passed
 * separately (rather than read off `fields`) since the caller resolves
 * the actual file upload/delete first and hands over the final id —
 * this function only ever touches the plain-data fields. */
export function applyDiveCertEdit(cert: DiveCert, fields: DiveCertFieldInput, photoFileId: string | undefined): DiveCert {
  return { ...cert, ...normalizeDiveCertFields(fields), photoFileId }
}
