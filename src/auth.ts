import type { Role } from './types'

const AUTH_KEY = 'jamia-pin-v1'
const SESSION_KEY = 'jamia-session-v1'
const GUEST_KEY = 'jamia-guest-login-v1'
const PBKDF2_ITERATIONS = 80_000
const FALLBACK_ROUNDS = 8_000

type PinAlgo = 'pbkdf2' | 'fallback'

type PinRecord = {
  v: 1
  salt: string
  hash: string
  iter: number
  algo: PinAlgo
}

export function normalizePin(raw: string): string {
  const western = raw
    .replace(/[٠-٩]/g, (digit) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit)))
    .replace(/[۰-۹]/g, (digit) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(digit)))
  return western.replace(/\D/g, '').slice(0, 8)
}

export function isValidPin(pin: string): boolean {
  return /^\d{4,8}$/.test(pin)
}

export function hasPin(): boolean {
  return loadPinRecord() !== null
}

export async function writePin(pin: string): Promise<void> {
  const normalized = normalizePin(pin)
  if (!isValidPin(normalized)) {
    throw new Error('الرقم السري يجب أن يكون من 4 إلى 8 أرقام.')
  }
  const salt = randomHex(16)
  const algo: PinAlgo = canUseSubtle() ? 'pbkdf2' : 'fallback'
  const iter = algo === 'pbkdf2' ? PBKDF2_ITERATIONS : FALLBACK_ROUNDS
  const hash = await derive(normalized, salt, iter, algo)
  const record: PinRecord = { v: 1, salt, hash, iter, algo }
  localStorage.setItem(AUTH_KEY, JSON.stringify(record))
}

export async function verifyPin(pin: string): Promise<boolean> {
  const record = loadPinRecord()
  if (!record) return false
  const normalized = normalizePin(pin)
  if (!normalized) return false
  if (record.algo === 'pbkdf2' && !canUseSubtle()) {
    throw new Error('افتح التطبيق من رابط يبدأ بـ https للتحقق من الرقم السري.')
  }
  const hash = await derive(normalized, record.salt, record.iter, record.algo)
  return safeEqual(hash, record.hash)
}

export function loadSession(): Role | null {
  try {
    const value = sessionStorage.getItem(SESSION_KEY)
    if (value === 'admin' || value === 'guest') return value
  } catch {
    /* Safari private mode */
  }
  return null
}

export function saveSession(role: Role): void {
  try {
    sessionStorage.setItem(SESSION_KEY, role)
  } catch {
    /* ignore */
  }
}

export function clearSession(): void {
  try {
    sessionStorage.removeItem(SESSION_KEY)
  } catch {
    /* ignore */
  }
}

export function isGuestLoginEnabled(): boolean {
  try {
    const raw = localStorage.getItem(GUEST_KEY)
    if (raw === null) return true
    return raw !== '0'
  } catch {
    return true
  }
}

export function writeGuestLoginEnabled(enabled: boolean): void {
  try {
    localStorage.setItem(GUEST_KEY, enabled ? '1' : '0')
  } catch {
    /* ignore */
  }
}

function loadPinRecord(): PinRecord | null {
  try {
    const raw = localStorage.getItem(AUTH_KEY)
    if (!raw) return null
    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return null
    const row = parsed as Record<string, unknown>
    if (row.v !== 1) return null
    if (typeof row.salt !== 'string' || typeof row.hash !== 'string') return null
    if (typeof row.iter !== 'number' || !Number.isFinite(row.iter)) return null
    if (row.algo !== 'pbkdf2' && row.algo !== 'fallback') return null
    return {
      v: 1,
      salt: row.salt,
      hash: row.hash,
      iter: Math.trunc(row.iter),
      algo: row.algo,
    }
  } catch {
    return null
  }
}

async function derive(pin: string, salt: string, iter: number, algo: PinAlgo): Promise<string> {
  if (algo === 'pbkdf2') {
    return pbkdf2Hex(pin, salt, iter)
  }
  return fallbackHash(pin, salt, iter)
}

async function pbkdf2Hex(pin: string, salt: string, iterations: number): Promise<string> {
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey('raw', encoder.encode(pin), 'PBKDF2', false, ['deriveBits'])
  const bits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      hash: 'SHA-256',
      iterations,
      salt: encoder.encode(salt),
    },
    key,
    256,
  )
  return bytesToHex(new Uint8Array(bits))
}

function fallbackHash(pin: string, salt: string, rounds: number): string {
  let acc = `${salt}:${pin}`
  for (let i = 0; i < rounds; i += 1) {
    acc = fnvPair(`${acc}:${i}:${pin}`)
  }
  return acc
}

function fnvPair(input: string): string {
  let a = 2166136261
  let b = 2166136261
  for (let i = 0; i < input.length; i += 1) {
    a ^= input.charCodeAt(i)
    a = Math.imul(a, 16777619)
    b ^= input.charCodeAt(input.length - 1 - i)
    b = Math.imul(b, 16777619)
  }
  return `${(a >>> 0).toString(16).padStart(8, '0')}${(b >>> 0).toString(16).padStart(8, '0')}`
}

function canUseSubtle(): boolean {
  return typeof crypto !== 'undefined' && typeof crypto.subtle !== 'undefined'
}

function randomHex(bytes: number): string {
  const buffer = new Uint8Array(bytes)
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    crypto.getRandomValues(buffer)
  } else {
    for (let i = 0; i < buffer.length; i += 1) buffer[i] = Math.floor(Math.random() * 256)
  }
  return bytesToHex(buffer)
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
}

function safeEqual(left: string, right: string): boolean {
  if (left.length !== right.length) return false
  let diff = 0
  for (let i = 0; i < left.length; i += 1) {
    diff |= left.charCodeAt(i) ^ right.charCodeAt(i)
  }
  return diff === 0
}
