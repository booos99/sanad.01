import { CURRENCIES, HIJRI_MONTHS, MONTHS_AR, type CalendarMode } from './types'

export type DateParts = {
  year: number
  month: number
  day: number
}

export function currencySymbol(code: string): string {
  return CURRENCIES.find((item) => item.id === code)?.symbol ?? code
}

export function formatMoney(amount: number, currency: string): string {
  const formatted = new Intl.NumberFormat('ar-SA', {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  }).format(amount)
  return `${formatted} ${currencySymbol(currency)}`
}

export function formatDateTime(ms: number): string {
  try {
    return new Intl.DateTimeFormat('ar-SA', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(ms))
  } catch {
    return new Date(ms).toLocaleString('ar')
  }
}

export function parseIsoDate(isoDate: string): Date | null {
  const [year, month, day] = isoDate.split('-').map(Number)
  if (!year || !month || !day) return null
  return new Date(year, month - 1, day, 12)
}

export function toIsoDate(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

export function formatHijri(isoDate: string): string {
  const date = parseIsoDate(isoDate)
  if (!date) return ''
  const text = formatCalendar(date, 'islamic-umalqura') || formatCalendar(date, 'islamic')
  return withSuffix(text, 'هـ')
}

export function formatGregorian(isoDate: string): string {
  const date = parseIsoDate(isoDate)
  if (!date) return isoDate
  return withSuffix(formatCalendar(date, 'gregory') || fallbackGregorian(isoDate), 'م')
}

export function formatCompact(isoDate: string, calendar: CalendarMode): string {
  const date = parseIsoDate(isoDate)
  if (!date) return isoDate
  const cal = calendar === 'hijri' ? 'islamic-umalqura' : 'gregory'
  try {
    const text = new Intl.DateTimeFormat(`ar-SA-u-ca-${cal}`, {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(date)
    return withSuffix(text, calendar === 'hijri' ? 'هـ' : 'م')
  } catch {
    return calendar === 'hijri' ? formatHijri(isoDate) : formatGregorian(isoDate)
  }
}

export function formatDate(isoDate: string): string {
  const hijri = formatHijri(isoDate)
  const gregorian = formatGregorian(isoDate)
  return hijri ? `${hijri} — ${gregorian}` : gregorian
}

export function dualDate(isoDate: string): { hijri: string; gregorian: string } {
  return {
    hijri: formatHijri(isoDate),
    gregorian: formatGregorian(isoDate),
  }
}

export function formatMonthBoth(year: number, month: number): { gregorian: string; hijri: string } {
  const start = `${year}-${String(month).padStart(2, '0')}-01`
  const lastDay = new Date(year, month, 0).getDate()
  const end = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
  const startHijri = hijriMonthYear(start)
  const endHijri = hijriMonthYear(end)
  const hijri =
    startHijri && endHijri && startHijri !== endHijri
      ? `${startHijri} / ${endHijri}`
      : startHijri || endHijri
  return {
    gregorian: MONTHS_AR[month - 1] ? `${MONTHS_AR[month - 1]} ${year} م` : `${month} ${year} م`,
    hijri,
  }
}

export function todayIso(): string {
  const now = new Date()
  return toIsoDate(now.getFullYear(), now.getMonth() + 1, now.getDate())
}

export function currentYearMonth(): { year: number; month: number } {
  const now = new Date()
  return { year: now.getFullYear(), month: now.getMonth() + 1 }
}

export function isoToParts(isoDate: string, calendar: CalendarMode): DateParts {
  const date = parseIsoDate(isoDate) ?? new Date()
  return calendar === 'hijri' ? hijriParts(date) : {
    year: date.getFullYear(),
    month: date.getMonth() + 1,
    day: date.getDate(),
  }
}

export function partsToIso(parts: DateParts, calendar: CalendarMode): string {
  if (calendar === 'gregorian') {
    const max = new Date(parts.year, parts.month, 0).getDate()
    const day = Math.min(parts.day, max)
    return toIsoDate(parts.year, parts.month, day)
  }
  const max = daysInHijriMonth(parts.year, parts.month)
  return fromHijri(parts.year, parts.month, Math.min(parts.day, max))
}

export function daysInCalendarMonth(year: number, month: number, calendar: CalendarMode): number {
  if (calendar === 'gregorian') return new Date(year, month, 0).getDate()
  return daysInHijriMonth(year, month)
}

export function monthNames(calendar: CalendarMode): readonly string[] {
  return calendar === 'hijri' ? HIJRI_MONTHS : MONTHS_AR
}

export function yearChoices(centerYear: number): number[] {
  const years: number[] = []
  for (let year = centerYear - 6; year <= centerYear + 3; year += 1) {
    years.push(year)
  }
  return years
}

export function newId(): string {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID()
    }
  } catch {
    /* HTTP on iPhone is not a secure context */
  }
  const bytes = new Uint8Array(16)
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    crypto.getRandomValues(bytes)
  } else {
    for (let i = 0; i < bytes.length; i += 1) bytes[i] = Math.floor(Math.random() * 256)
  }
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
}

function hijriParts(date: Date): DateParts {
  try {
    const bag = Object.fromEntries(
      new Intl.DateTimeFormat('en-u-ca-islamic-umalqura', {
        day: 'numeric',
        month: 'numeric',
        year: 'numeric',
      })
        .formatToParts(date)
        .map((part) => [part.type, part.value]),
    )
    return {
      year: Number(bag.year),
      month: Number(bag.month),
      day: Number(bag.day),
    }
  } catch {
    return { year: 1447, month: 1, day: 1 }
  }
}

function fromHijri(year: number, month: number, day: number): string {
  const islamicEpoch = Date.UTC(622, 6, 19, 12)
  const approxDays = (year - 1) * 354.36708 + (month - 1) * 29.53059 + (day - 1)
  let time = islamicEpoch + Math.round(approxDays) * 86_400_000
  const wanted = year * 10_000 + month * 100 + day

  for (let step = 0; step < 12; step += 1) {
    const local = localFromUtc(time)
    const gotParts = hijriParts(local)
    const got = gotParts.year * 10_000 + gotParts.month * 100 + gotParts.day
    if (got === wanted) return toIsoDate(local.getFullYear(), local.getMonth() + 1, local.getDate())
    time += (wanted - got) * 86_400_000
  }

  const base = localFromUtc(time)
  for (let delta = -14; delta <= 14; delta += 1) {
    const local = new Date(base.getFullYear(), base.getMonth(), base.getDate() + delta, 12)
    const got = hijriParts(local)
    if (got.year === year && got.month === month && got.day === day) {
      return toIsoDate(local.getFullYear(), local.getMonth() + 1, local.getDate())
    }
  }
  return todayIso()
}

function daysInHijriMonth(year: number, month: number): number {
  const iso = fromHijri(year, month, 30)
  const parts = isoToParts(iso, 'hijri')
  if (parts.year === year && parts.month === month && parts.day === 30) return 30
  return 29
}

function localFromUtc(time: number): Date {
  const utc = new Date(time)
  return new Date(utc.getUTCFullYear(), utc.getUTCMonth(), utc.getUTCDate(), 12)
}

function formatCalendar(date: Date, calendar: string): string {
  try {
    return new Intl.DateTimeFormat(`ar-SA-u-ca-${calendar}`, {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(date)
  } catch {
    return ''
  }
}

function hijriMonthYear(isoDate: string): string {
  const date = parseIsoDate(isoDate)
  if (!date) return ''
  try {
    const text = new Intl.DateTimeFormat('ar-SA-u-ca-islamic-umalqura', {
      month: 'long',
      year: 'numeric',
    }).format(date)
    return withSuffix(text, 'هـ')
  } catch {
    return ''
  }
}

function withSuffix(text: string, suffix: string): string {
  if (!text) return ''
  const trimmed = text.trim()
  return trimmed.endsWith(suffix) ? trimmed : `${trimmed} ${suffix}`
}

function fallbackGregorian(isoDate: string): string {
  const [year, month, day] = isoDate.split('-').map(Number)
  if (!year || !month || !day) return isoDate
  return `${day} ${MONTHS_AR[month - 1]} ${year}`
}
