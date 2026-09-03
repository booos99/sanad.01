import { backupFileName, downloadBackup, toBackupJson } from './storage'
import type { AppData } from './types'

export type ShareResult = 'shared' | 'downloaded'

export async function shareBackup(data: AppData): Promise<ShareResult> {
  const json = toBackupJson(data)
  const txtName = backupFileName().replace(/\.json$/, '.txt')
  const jsonName = backupFileName()

  if (typeof navigator.share !== 'function') {
    downloadBackup(data)
    return 'downloaded'
  }

  const candidates = [
    new File([json], txtName, { type: 'text/plain' }),
    new File([json], jsonName, { type: 'application/json' }),
  ]
  const file =
    candidates.find((item) => canShareFile(item)) ?? candidates[0]

  try {
    await navigator.share({ files: [file] })
    return 'shared'
  } catch (error) {
    if (isAbort(error)) return 'shared'
  }

  downloadBackup(data)
  return 'downloaded'
}

function canShareFile(file: File): boolean {
  try {
    return !navigator.canShare || navigator.canShare({ files: [file] })
  } catch {
    return false
  }
}

function isAbort(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError'
}
