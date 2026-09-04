import type { AppData } from './types'

const DB_NAME = 'jamia-auto-backup-v1'
const STORE = 'snapshots'
const MAX_BACKUPS = 10
const DEBOUNCE_MS = 1500

export type BackupMeta = {
  id: string
  createdAt: number
  members: number
  payments: number
  expenses: number
}

type BackupRecord = BackupMeta & {
  data: AppData
}

let debounceTimer: ReturnType<typeof setTimeout> | null = null
let lastJson = ''
let initialLock = false

export function enqueueAutoBackup(data: AppData): void {
  const json = JSON.stringify(data)
  if (json === lastJson) return
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => {
    debounceTimer = null
    void persistBackup(data, json).catch(() => {
      /* Safari private mode / full storage */
    })
  }, DEBOUNCE_MS)
}

export async function saveBackupNow(data: AppData): Promise<BackupMeta> {
  if (debounceTimer) {
    clearTimeout(debounceTimer)
    debounceTimer = null
  }
  return persistBackup(data, JSON.stringify(data), true)
}

export async function ensureInitialBackup(data: AppData): Promise<void> {
  if (initialLock) return
  initialLock = true
  try {
    const existing = await listBackups()
    if (existing.length > 0) return
    await persistBackup(data, JSON.stringify(data))
  } catch {
    initialLock = false
  }
}

export async function listBackups(): Promise<BackupMeta[]> {
  const records = await getAll()
  return records
    .sort((a, b) => b.createdAt - a.createdAt)
    .map((item) => ({
      id: item.id,
      createdAt: item.createdAt,
      members: item.members,
      payments: item.payments,
      expenses: item.expenses,
    }))
}

export async function getBackupData(id: string): Promise<AppData | null> {
  const records = await getAll()
  return records.find((item) => item.id === id)?.data ?? null
}

async function persistBackup(data: AppData, json: string, force = false): Promise<BackupMeta> {
  if (!force && json === lastJson) {
    const existing = await listBackups()
    const latest = existing[0]
    if (latest) return latest
  }
  const record: BackupRecord = {
    id: backupId(),
    createdAt: Date.now(),
    members: data.members.length,
    payments: data.payments.length,
    expenses: data.expenses.length,
    data: JSON.parse(json) as AppData,
  }
  const db = await openDb()
  try {
    const current = await getAllWith(db)
    const next = [record, ...current].sort((a, b) => b.createdAt - a.createdAt).slice(0, MAX_BACKUPS)
    await replaceAll(db, next)
    lastJson = json
    return {
      id: record.id,
      createdAt: record.createdAt,
      members: record.members,
      payments: record.payments,
      expenses: record.expenses,
    }
  } finally {
    db.close()
  }
}

function backupId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(16).slice(2, 10)}`
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB unavailable'))
      return
    }
    const request = indexedDB.open(DB_NAME, 1)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'id' })
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('تعذر فتح قاعدة النسخ'))
  })
}

async function getAll(): Promise<BackupRecord[]> {
  const db = await openDb()
  try {
    return await getAllWith(db)
  } finally {
    db.close()
  }
}

function getAllWith(db: IDBDatabase): Promise<BackupRecord[]> {
  return new Promise((resolve, reject) => {
    const request = db.transaction(STORE, 'readonly').objectStore(STORE).getAll()
    request.onsuccess = () => resolve((request.result as BackupRecord[]) ?? [])
    request.onerror = () => reject(request.error ?? new Error('تعذر قراءة النسخ'))
  })
}

function replaceAll(db: IDBDatabase, records: BackupRecord[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    const store = tx.objectStore(STORE)
    store.clear()
    for (const record of records) store.put(record)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error ?? new Error('تعذر حفظ النسخة'))
  })
}
