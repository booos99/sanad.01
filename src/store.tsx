import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { currentYearMonth, newId, todayIso } from './format'
import { loadData, parseBackup, saveData } from './storage'
import type { AppData, CalendarMode, Expense, Member, Payment, Settings } from './types'

type StoreValue = {
  data: AppData
  calendar: CalendarMode
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

export function StoreProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppData>(() => loadData())

  useEffect(() => {
    saveData(data)
  }, [data])

  const updateSettings = useCallback((patch: Partial<Settings>) => {
    setData((prev) => ({
      ...prev,
      settings: { ...prev.settings, ...patch },
    }))
  }, [])

  const setCalendar = useCallback((calendar: CalendarMode) => {
    setData((prev) => ({
      ...prev,
      settings: { ...prev.settings, calendar },
    }))
  }, [])

  const addMember = useCallback((name: string, phone: string, joinedAt: string) => {
    const member: Member = {
      id: newId(),
      name: name.trim(),
      phone: phone.trim(),
      createdAt: joinedAt || todayIso(),
    }
    setData((prev) => ({ ...prev, members: [...prev.members, member] }))
  }, [])

  const deleteMember = useCallback((id: string) => {
    setData((prev) => ({
      ...prev,
      members: prev.members.filter((member) => member.id !== id),
      payments: prev.payments.filter((payment) => payment.memberId !== id),
    }))
  }, [])

  const setPayment = useCallback(
    (memberId: string, year: number, month: number, date: string, amount: number) => {
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
    [],
  )

  const unmarkPaid = useCallback((memberId: string, year: number, month: number) => {
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
  }, [])

  const addExpense = useCallback((title: string, amount: number, date: string) => {
    const expense: Expense = {
      id: newId(),
      title: title.trim(),
      amount,
      date,
    }
    setData((prev) => ({ ...prev, expenses: [expense, ...prev.expenses] }))
  }, [])

  const deleteExpense = useCallback((id: string) => {
    setData((prev) => ({
      ...prev,
      expenses: prev.expenses.filter((expense) => expense.id !== id),
    }))
  }, [])

  const replaceAll = useCallback((next: AppData) => {
    setData(next)
  }, [])

  const importFromText = useCallback((text: string) => {
    setData(parseBackup(text))
  }, [])

  const value = useMemo(() => {
    const { collected, spent, balance } = totals(data)
    return {
      data,
      calendar: (data.settings.calendar === 'hijri' ? 'hijri' : 'gregorian') as CalendarMode,
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
    }
  }, [
    data,
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
