import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import {
  clearSession,
  hasPin,
  isGuestLoginEnabled,
  loadSession,
  saveSession,
  verifyPin,
  writeGuestLoginEnabled,
  writePin,
} from './auth'
import {
  enqueueAutoBackup,
  ensureInitialBackup,
  getBackupData,
  listBackups,
  saveBackupNow,
  type BackupMeta,
} from './autoBackup'
import { currentYearMonth, newId, todayIso } from './format'
import { loadData, parseBackup, saveData } from './storage'
import type { AppData, CalendarMode, Expense, Member, Payment, Role, Settings } from './types'

type StoreValue = {
  data: AppData
  calendar: CalendarMode
  role: Role | null
  canEdit: boolean
  pinReady: boolean
  guestEnabled: boolean
  backups: BackupMeta[]
  balance: number
  collected: number
  spent: number
  updateSettings: (patch: Partial<Settings>) => void
  setCalendar: (calendar: CalendarMode) => void
  addMember: (name: string, phone: string, joinedAt: string) => void
  deleteMember: (id: string) => void
  setPayment: (memberId: string, year: number, month: number, date: string, amount: number) => void
  unmarkPaid: (memberId: string, year: number, month: number) => void
  addExpense: (title: string, amount: number, date: string) => void
  deleteExpense: (id: string) => void
  replaceAll: (next: AppData) => void
  importFromText: (text: string) => void
  setupPin: (pin: string) => Promise<void>
  loginAdmin: (pin: string) => Promise<boolean>
  loginGuest: () => void
  setGuestEnabled: (enabled: boolean) => void
  logout: () => void
  changePin: (current: string, next: string) => Promise<boolean>
  refreshBackups: () => Promise<void>
  snapshotNow: () => Promise<void>
  restoreBackup: (id: string) => Promise<void>
}

const StoreContext = createContext<StoreValue | null>(null)

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100
}

function totals(data: AppData) {
  const collected = roundMoney(data.payments.reduce((sum, item) => sum + item.amount, 0))
  const spent = roundMoney(data.expenses.reduce((sum, item) => sum + item.amount, 0))
  const balance = roundMoney(data.settings.openingBalance + collected - spent)
  return { collected, spent, balance }
}

function initialRole(): Role | null {
  if (!hasPin()) return null
  const session = loadSession()
  if (session === 'guest' && !isGuestLoginEnabled()) {
    clearSession()
    return null
  }
  return session
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppData>(() => loadData())
  const [role, setRole] = useState<Role | null>(initialRole)
  const [pinReady, setPinReady] = useState(() => hasPin())
  const [guestEnabled, setGuestEnabledState] = useState(() => isGuestLoginEnabled())
  const [guestCalendar, setGuestCalendar] = useState<CalendarMode | null>(null)
  const [backups, setBackups] = useState<BackupMeta[]>([])
  const skipBackup = useRef(true)

  useEffect(() => {
    saveData(data)
  }, [data])

  useEffect(() => {
    void ensureInitialBackup(data)
    void listBackups()
      .then(setBackups)
      .catch(() => setBackups([]))
    // Snapshot existing data once after install/update; later edits are debounced.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (skipBackup.current) {
      skipBackup.current = false
      return
    }
    enqueueAutoBackup(data)
  }, [data])

  const refreshBackups = useCallback(async () => {
    try {
      setBackups(await listBackups())
    } catch {
      setBackups([])
    }
  }, [])

  const setupPin = useCallback(async (pin: string) => {
    await writePin(pin)
    setPinReady(true)
    saveSession('admin')
    setRole('admin')
  }, [])

  const loginAdmin = useCallback(async (pin: string) => {
    const ok = await verifyPin(pin)
    if (!ok) return false
    saveSession('admin')
    setRole('admin')
    setGuestCalendar(null)
    return true
  }, [])

  const loginGuest = useCallback(() => {
    if (!hasPin() || !guestEnabled) return
    saveSession('guest')
    setRole('guest')
    setGuestCalendar(null)
  }, [guestEnabled])

  const setGuestEnabled = useCallback(
    (enabled: boolean) => {
      if (role !== 'admin') return
      writeGuestLoginEnabled(enabled)
      setGuestEnabledState(enabled)
    },
    [role],
  )

  const logout = useCallback(() => {
    clearSession()
    setRole(null)
    setGuestCalendar(null)
  }, [])

  const changePin = useCallback(async (current: string, next: string) => {
    const ok = await verifyPin(current)
    if (!ok) return false
    await writePin(next)
    return true
  }, [])

  const snapshotNow = useCallback(async () => {
    if (role !== 'admin') return
    await saveBackupNow(data)
    await refreshBackups()
  }, [data, refreshBackups, role])

  const restoreBackup = useCallback(
    async (id: string) => {
      if (role !== 'admin') return
      const next = await getBackupData(id)
      if (!next) throw new Error('النسخة غير موجودة')
      setData(parseBackup(JSON.stringify(next)))
      await refreshBackups()
    },
    [refreshBackups, role],
  )

  const updateSettings = useCallback(
    (patch: Partial<Settings>) => {
      if (role !== 'admin') return
      setData((prev) => ({
        ...prev,
        settings: { ...prev.settings, ...patch },
      }))
    },
    [role],
  )

  const setCalendar = useCallback(
    (calendar: CalendarMode) => {
      if (role !== 'admin') {
        setGuestCalendar(calendar)
        return
      }
      setData((prev) => ({
        ...prev,
        settings: { ...prev.settings, calendar },
      }))
    },
    [role],
  )

  const addMember = useCallback(
    (name: string, phone: string, joinedAt: string) => {
      if (role !== 'admin') return
      const member: Member = {
        id: newId(),
        name: name.trim(),
        phone: phone.trim(),
        createdAt: joinedAt || todayIso(),
      }
      setData((prev) => ({ ...prev, members: [...prev.members, member] }))
    },
    [role],
  )

  const deleteMember = useCallback(
    (id: string) => {
      if (role !== 'admin') return
      setData((prev) => ({
        ...prev,
        members: prev.members.filter((member) => member.id !== id),
        payments: prev.payments.filter((payment) => payment.memberId !== id),
      }))
    },
    [role],
  )

  const setPayment = useCallback(
    (memberId: string, year: number, month: number, date: string, amount: number) => {
      if (role !== 'admin') return
      setData((prev) => {
        const others = prev.payments.filter(
          (payment) =>
            !(
              payment.memberId === memberId &&
              payment.year === year &&
              payment.month === month
            ),
        )
        if (!Number.isFinite(amount) || amount <= 0) {
          return { ...prev, payments: others }
        }
        const existing = prev.payments.find(
          (payment) =>
            payment.memberId === memberId &&
            payment.year === year &&
            payment.month === month,
        )
        const payment: Payment = {
          id: existing?.id ?? newId(),
          memberId,
          year,
          month,
          amount,
          date,
        }
        return { ...prev, payments: [...others, payment] }
      })
    },
    [role],
  )

  const unmarkPaid = useCallback(
    (memberId: string, year: number, month: number) => {
      if (role !== 'admin') return
      setData((prev) => ({
        ...prev,
        payments: prev.payments.filter(
          (payment) =>
            !(
              payment.memberId === memberId &&
              payment.year === year &&
              payment.month === month
            ),
        ),
      }))
    },
    [role],
  )

  const addExpense = useCallback(
    (title: string, amount: number, date: string) => {
      if (role !== 'admin') return
      const expense: Expense = {
        id: newId(),
        title: title.trim(),
        amount,
        date,
      }
      setData((prev) => ({ ...prev, expenses: [expense, ...prev.expenses] }))
    },
    [role],
  )

  const deleteExpense = useCallback(
    (id: string) => {
      if (role !== 'admin') return
      setData((prev) => ({
        ...prev,
        expenses: prev.expenses.filter((expense) => expense.id !== id),
      }))
    },
    [role],
  )

  const replaceAll = useCallback(
    (next: AppData) => {
      if (role !== 'admin') return
      setData(next)
    },
    [role],
  )

  const importFromText = useCallback(
    (text: string) => {
      if (role !== 'admin') return
      setData(parseBackup(text))
    },
    [role],
  )

  const value = useMemo(() => {
    const { collected, spent, balance } = totals(data)
    const canEdit = role === 'admin'
    const calendar: CalendarMode =
      role === 'guest' && guestCalendar
        ? guestCalendar
        : data.settings.calendar === 'hijri'
          ? 'hijri'
          : 'gregorian'
    return {
      data,
      calendar,
      role,
      canEdit,
      pinReady,
      guestEnabled,
      backups,
      balance,
      collected,
      spent,
      updateSettings,
      setCalendar,
      addMember,
      deleteMember,
      setPayment,
      unmarkPaid,
      addExpense,
      deleteExpense,
      replaceAll,
      importFromText,
      setupPin,
      loginAdmin,
      loginGuest,
      setGuestEnabled,
      logout,
      changePin,
      refreshBackups,
      snapshotNow,
      restoreBackup,
    }
  }, [
    addExpense,
    addMember,
    backups,
    changePin,
    data,
    deleteExpense,
    deleteMember,
    guestCalendar,
    guestEnabled,
    importFromText,
    loginAdmin,
    loginGuest,
    logout,
    setGuestEnabled,
    pinReady,
    refreshBackups,
    replaceAll,
    restoreBackup,
    role,
    setCalendar,
    setPayment,
    setupPin,
    snapshotNow,
    unmarkPaid,
    updateSettings,
  ])

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function useStore(): StoreValue {
  const value = useContext(StoreContext)
  if (!value) throw new Error('useStore must be used inside StoreProvider')
  return value
}

export function memberPaidTotal(data: AppData, memberId: string): number {
  return roundMoney(
    memberPayments(data, memberId).reduce((sum, payment) => sum + payment.amount, 0),
  )
}

export function memberPayments(data: AppData, memberId: string): Payment[] {
  return data.payments
    .filter((payment) => payment.memberId === memberId)
    .sort((a, b) => b.year - a.year || b.month - a.month || b.date.localeCompare(a.date))
}

export function monthPayments(data: AppData, year: number, month: number) {
  return data.payments.filter(
    (payment) => payment.year === year && payment.month === month,
  )
}

export function monthExpenses(data: AppData, year: number, month: number) {
  const prefix = `${year}-${String(month).padStart(2, '0')}`
  return data.expenses.filter((expense) => expense.date.startsWith(prefix))
}

export function thisMonthSummary(data: AppData) {
  const { year, month } = currentYearMonth()
  const payments = monthPayments(data, year, month)
  const expenses = monthExpenses(data, year, month)
  const due = data.settings.monthlyAmount
  const paidCount = data.members.filter((member) => {
    const payment = payments.find((item) => item.memberId === member.id)
    return paymentStatus(payment?.amount ?? 0, due) === 'full'
  }).length
  return {
    year,
    month,
    paidCount,
    memberCount: data.members.length,
    collected: roundMoney(payments.reduce((sum, item) => sum + item.amount, 0)),
    spent: roundMoney(expenses.reduce((sum, item) => sum + item.amount, 0)),
  }
}

export function paymentStatus(paid: number, due: number): 'none' | 'partial' | 'full' {
  if (paid <= 0) return 'none'
  if (due <= 0 || paid + 0.0001 >= due) return 'full'
  return 'partial'
}

export function remainingOf(paid: number, due: number): number {
  return Math.max(0, roundMoney(due - paid))
}
