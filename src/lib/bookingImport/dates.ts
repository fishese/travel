import { localDateStr } from '../dateUtils'

const MONTHS: Record<string, number> = {
  jan: 1,
  january: 1,
  feb: 2,
  february: 2,
  mar: 3,
  march: 3,
  apr: 4,
  april: 4,
  may: 5,
  jun: 6,
  june: 6,
  jul: 7,
  july: 7,
  aug: 8,
  august: 8,
  sep: 9,
  sept: 9,
  september: 9,
  oct: 10,
  october: 10,
  nov: 11,
  november: 11,
  dec: 12,
  december: 12,
}

const MONTH_NAMES_PATTERN = Object.keys(MONTHS)
  .sort((a, b) => b.length - a.length)
  .join('|')

const ERA_BASE: Record<string, number> = { 令和: 2018, 平成: 1988, 昭和: 1925 }

export interface FoundDate {
  date: string
  index: number
  end: number
  yearInferred: boolean
}

export interface TimeHit {
  time: string
  index: number
  end: number
}

function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

function validYmd(year: number, month: number, day: number): boolean {
  if (month < 1 || month > 12 || day < 1 || day > 31) return false
  const dt = new Date(year, month - 1, day)
  return dt.getFullYear() === year && dt.getMonth() === month - 1 && dt.getDate() === day
}

function withYear(year: number | undefined, month: number, day: number, today: string): { year: number; yearInferred: boolean } | null {
  if (year) return validYmd(year, month, day) ? { year, yearInferred: false } : null
  const thisYear = +today.slice(0, 4)
  const candidate = `${thisYear}-${pad2(month)}-${pad2(day)}`
  const inferred = candidate < today ? thisYear + 1 : thisYear
  return validYmd(inferred, month, day) ? { year: inferred, yearInferred: true } : null
}

function pushDate(
  found: FoundDate[],
  index: number,
  end: number,
  year: number | undefined,
  month: number,
  day: number,
  today: string,
) {
  const resolved = withYear(year, month, day, today)
  if (!resolved) return
  found.push({
    date: `${resolved.year}-${pad2(month)}-${pad2(day)}`,
    index,
    end,
    yearInferred: resolved.yearInferred,
  })
}

/** Every unambiguous date in the text, earliest first. Overlapping matches
 * (a 年月日 date that also contains 月日) keep the longer span. Numeric
 * dates with both day and month ≤ 12 are omitted — see findAmbiguousDates. */
export function findDates(text: string, today: string = localDateStr()): FoundDate[] {
  const found: FoundDate[] = []

  for (const match of text.matchAll(/(令和|平成|昭和)\s*(\d{1,2})年\s*(\d{1,2})月\s*(\d{1,2})日/g)) {
    const base = ERA_BASE[match[1]]
    pushDate(found, match.index, match.index + match[0].length, base + +match[2], +match[3], +match[4], today)
  }

  for (const match of text.matchAll(/(\d{4})年\s*(\d{1,2})月\s*(\d{1,2})日/g)) {
    pushDate(found, match.index, match.index + match[0].length, +match[1], +match[2], +match[3], today)
  }

  for (const match of text.matchAll(/(?<!\d年)(?<!\d)(\d{1,2})月\s*(\d{1,2})日/g)) {
    pushDate(found, match.index, match.index + match[0].length, undefined, +match[1], +match[2], today)
  }

  for (const match of text.matchAll(/\b(\d{4})-(\d{2})-(\d{2})\b/g)) {
    pushDate(found, match.index, match.index + match[0].length, +match[1], +match[2], +match[3], today)
  }

  for (const match of text.matchAll(/(?<!\d)(\d{4})[./](\d{1,2})[./](\d{1,2})(?!\d)/g)) {
    pushDate(found, match.index, match.index + match[0].length, +match[1], +match[2], +match[3], today)
  }

  for (const match of text.matchAll(new RegExp(`\\b(\\d{1,2})(?:st|nd|rd|th)?\\s+(${MONTH_NAMES_PATTERN})\\.?,?\\s*(\\d{4})?\\b`, 'gi'))) {
    pushDate(found, match.index, match.index + match[0].length, match[3] ? +match[3] : undefined, MONTHS[match[2].toLowerCase()], +match[1], today)
  }

  for (const match of text.matchAll(new RegExp(`\\b(${MONTH_NAMES_PATTERN})\\.?\\s+(\\d{1,2})(?:st|nd|rd|th)?,?\\s*(\\d{4})?\\b`, 'gi'))) {
    pushDate(found, match.index, match.index + match[0].length, match[3] ? +match[3] : undefined, MONTHS[match[1].toLowerCase()], +match[2], today)
  }

  for (const match of text.matchAll(/(?<!\d)(\d{1,2})[./](\d{1,2})[./](\d{4})(?!\d)/g)) {
    const a = +match[1]
    const b = +match[2]
    const year = +match[3]
    if (a > 12 && b >= 1 && b <= 12) pushDate(found, match.index, match.index + match[0].length, year, b, a, today)
    else if (b > 12 && a >= 1 && a <= 12) pushDate(found, match.index, match.index + match[0].length, year, a, b, today)
  }

  return resolveOverlaps(found)
}

/** Slash or dot dates where both numbers could be the month. Callers should
 * warn and leave the field blank instead of guessing DD/MM vs MM/DD. */
export function findAmbiguousDates(text: string): string[] {
  const out: string[] = []
  for (const match of text.matchAll(/(?<!\d)(\d{1,2})[./](\d{1,2})[./](\d{4})(?!\d)/g)) {
    const a = +match[1]
    const b = +match[2]
    if (a >= 1 && a <= 12 && b >= 1 && b <= 12) out.push(match[0])
  }
  return out
}

function resolveOverlaps(items: FoundDate[]): FoundDate[] {
  const sorted = [...items].sort((a, b) => a.index - b.index || b.end - a.end)
  const kept: FoundDate[] = []
  let cursor = -1
  for (const item of sorted) {
    if (item.index < cursor) continue
    kept.push(item)
    cursor = item.end
  }
  return kept
}

export function addDays(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  dt.setDate(dt.getDate() + days)
  return localDateStr(dt)
}

/** 24-hour times, including 午前/午後 and 時分. A dot is only treated as a
 * separator when AM/PM is written out, so a date like 2026.08.25 is not a time. */
export function findTimes(text: string): TimeHit[] {
  const hits: TimeHit[] = []

  for (const match of text.matchAll(/(午前|午後)\s*(\d{1,2})\s*時(?:\s*(\d{1,2})\s*分)?/g)) {
    let h = +match[2]
    const minute = match[3] ? +match[3] : 0
    if (minute > 59 || h > 12) continue
    if (match[1] === '午後' && h < 12) h += 12
    if (match[1] === '午前' && h === 12) h = 0
    hits.push({ time: `${pad2(h)}:${pad2(minute)}`, index: match.index, end: match.index + match[0].length })
  }

  for (const match of text.matchAll(/(?<!午前)(?<!午後)(\d{1,2})\s*時(?:\s*(\d{1,2})\s*分)?/g)) {
    const h = +match[1]
    const minute = match[2] ? +match[2] : 0
    if (h > 23 || minute > 59) continue
    hits.push({ time: `${pad2(h)}:${pad2(minute)}`, index: match.index, end: match.index + match[0].length })
  }

  for (const match of text.matchAll(/(?<!\d)([01]?\d|2[0-3])[:]([0-5]\d)(?!\d)\s*([AaPp]\.?[Mm]\.?)?/g)) {
    let h = +match[1]
    const ampm = match[3]?.toLowerCase().replace(/\./g, '')
    if (ampm === 'pm' && h < 12) h += 12
    if (ampm === 'am' && h === 12) h = 0
    if (ampm === 'pm' && h > 23) continue
    if (!ampm && h > 23) continue
    hits.push({ time: `${pad2(h)}:${match[2]}`, index: match.index, end: match.index + match[0].length })
  }

  for (const match of text.matchAll(/(?<!\d)([1-9]|1[0-2])[.]([0-5]\d)\s*([AaPp][Mm])/g)) {
    let h = +match[1]
    const ampm = match[3].toLowerCase()
    if (ampm === 'pm' && h < 12) h += 12
    if (ampm === 'am' && h === 12) h = 0
    hits.push({ time: `${pad2(h)}:${match[2]}`, index: match.index, end: match.index + match[0].length })
  }

  return resolveTimeOverlaps(hits)
}

function resolveTimeOverlaps(items: TimeHit[]): TimeHit[] {
  const sorted = [...items].sort((a, b) => a.index - b.index || b.end - a.end)
  const kept: TimeHit[] = []
  let cursor = -1
  for (const item of sorted) {
    if (item.index < cursor) continue
    kept.push(item)
    cursor = item.end
  }
  return kept
}

export function normalizeBookingText(text: string): string {
  return text.normalize('NFKC').replace(/\u00a0/g, ' ').replace(/\r\n/g, '\n')
}

/** First time after a keyword, within a short window. */
export function timeAfter(text: string, keyword: RegExp, window = 90): string | undefined {
  const flags = keyword.flags.includes('g') ? keyword.flags : keyword.flags + 'g'
  const re = new RegExp(keyword.source, flags)
  const match = re.exec(text)
  if (!match) return undefined
  const from = match.index + match[0].length
  const slice = text.slice(from, from + window)
  const hit = findTimes(slice)[0]
  return hit?.time
}
