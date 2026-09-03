import { newId, parseIsoDate, todayIso } from './format'
import { defaultData, type AppData, type Expense, type Member, type Payment } from './types'

const STORAGE_KEY = 'jamia-family-fund-v1'

export function loadData(): AppData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return defaultData()
    const parsed: unknown = JSON.parse(raw)
    if (!isAppData(parsed)) return defaultData()
    return normalizeData(parsed)
  } catch {
    return defaultData()
  }
}

export function saveData(data: AppData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch {
    /* Safari private mode / full storage */
  }
}

export function isAppData(value: unknown): value is AppData {
  if (!value || typeof value !== 'object') return false
  const data = value as Record<string, unknown>
  if (!data.settings || typeof data.settings !== 'object') return false
  const settings = data.settings as Record<string, unknown>
  return (
    typeof settings.name === 'string' &&
    typeof settings.monthlyAmount === 'number' &&
    Number.isFinite(settings.monthlyAmount) &&
    typeof settings.currency === 'string' &&
    typeof settings.openingBalance === 'number' &&
    Number.isFinite(settings.openingBalance) &&
    Array.isArray(data.members) &&
    Array.isArray(data.payments) &&
    Array.isArray(data.expenses)
  )
}

export function backupFileName(): string {
  return `jamia-${todayStamp()}.json`
}

function todayStamp(): string {
  const now = new Date()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${now.getFullYear()}-${month}-${day}`
}

export function toBackupJson(data: AppData): string {
  return JSON.stringify(data, null, 2)
}

export function parseBackup(text: string): AppData {
  const parsed: unknown = JSON.parse(text)
  if (!isAppData(parsed)) {
    throw new Error('ملف النسخة غير صالح')
  }
  return normalizeData({
    version: 1,
    settings: parsed.settings,
    members: parsed.members,
    payments: parsed.payments,
    expenses: parsed.expenses,
  })
}

function normalizeData(data: AppData): AppData {
  const defaults = defaultData().settings
  const members = unknownList(data.members)
    .map(normalizeMember)
    .filter((item): item is Member => item !== null)
  const memberIds = new Set(members.map((item) => item.id))
  const payments = unknownList(data.payments)
    .map(normalizePayment)
    .filter((item): item is Payment => item !== null && memberIds.has(item.memberId))
  const expenses = unknownList(data.expenses)
    .map(normalizeExpense)
    .filter((item): item is Expense => item !== null)

  return {
    version: 1,
    settings: {
      ...defaults,
      name: asText(data.settings.name).trim() || defaults.name,
      monthlyAmount: Math.max(0, asMoney(data.settings.monthlyAmount)),
      currency: asText(data.settings.currency) || defaults.currency,
      openingBalance: asMoney(data.settings.openingBalance),
      calendar: data.settings.calendar === 'hijri' ? 'hijri' : 'gregorian',
    },
    members,
    payments,
    expenses,
  }
}

function unknownList(value: unknown): unknown[] {
  return Array.isArray(value) ? value : []
}

function asText(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

function asMoney(value: unknown): number {
  const amount = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(amount)) return 0
  return Math.round(amount * 100) / 100
}

function asYear(value: unknown): number | null {
  const year = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(year)) return null
  const whole = Math.trunc(year)
  if (whole < 1300 || whole > 3100) return null
  return whole
}

function asMonth(value: unknown): number | null {
  const month = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(month)) return null
  const whole = Math.trunc(month)
  if (whole < 1 || whole > 12) return null
  return whole
}

function normalizeMember(value: unknown): Member | null {
  if (!value || typeof value !== 'object') return null
  const row = value as Record<string, unknown>
  const name = asText(row.name).trim()
  if (!name) return null
  const createdAt = asText(row.createdAt)
  return {
    id: asText(row.id) || newId(),
    name,
    phone: asText(row.phone).trim(),
    createdAt: parseIsoDate(createdAt) ? createdAt : todayIso(),
  }
}

function normalizePayment(value: unknown): Payment | null {
  if (!value || typeof value !== 'object') return null
  const row = value as Record<string, unknown>
  const memberId = asText(row.memberId)
  const year = asYear(row.year)
  const month = asMonth(row.month)
  const amount = asMoney(row.amount)
  const date = asText(row.date)
  if (!memberId || year === null || month === null || amount <= 0) return null
  return {
    id: asText(row.id) || newId(),
    memberId,
    year,
    month,
    amount,
    date: parseIsoDate(date) ? date : todayIso(),
  }
}

function normalizeExpense(value: unknown): Expense | null {
  if (!value || typeof value !== 'object') return null
  const row = value as Record<string, unknown>
  const title = asText(row.title).trim()
  const amount = asMoney(row.amount)
  const date = asText(row.date)
  if (!title || amount <= 0) return null
  return {
    id: asText(row.id) || newId(),
    title,
    amount,
    date: parseIsoDate(date) ? date : todayIso(),
  }
}

export function downloadBackup(data: AppData): string {
  const json = toBackupJson(data)
  const name = backupFileName()
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = name
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
  return name
}
