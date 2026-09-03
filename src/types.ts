export type CalendarMode = 'hijri' | 'gregorian'

export type Settings = {
  name: string
  monthlyAmount: number
  currency: string
  openingBalance: number
  calendar: CalendarMode
}

export type Member = {
  id: string
  name: string
  phone: string
  createdAt: string
}

export type Payment = {
  id: string
  memberId: string
  year: number
  month: number
  amount: number
  date: string
}

export type Expense = {
  id: string
  title: string
  amount: number
  date: string
}

export type AppData = {
  version: 1
  settings: Settings
  members: Member[]
  payments: Payment[]
  expenses: Expense[]
}

export type Tab = 'home' | 'members' | 'payments' | 'expenses' | 'settings' | 'print'

export const CURRENCIES = [
  { id: 'SAR', label: 'ريال سعودي', symbol: 'ر.س' },
  { id: 'AED', label: 'درهم إماراتي', symbol: 'د.إ' },
  { id: 'KWD', label: 'دينار كويتي', symbol: 'د.ك' },
  { id: 'QAR', label: 'ريال قطري', symbol: 'ر.ق' },
  { id: 'BHD', label: 'دينار بحريني', symbol: 'د.ب' },
  { id: 'OMR', label: 'ريال عماني', symbol: 'ر.ع' },
  { id: 'EGP', label: 'جنيه مصري', symbol: 'ج.م' },
  { id: 'JOD', label: 'دينار أردني', symbol: 'د.أ' },
  { id: 'USD', label: 'دولار أمريكي', symbol: '$' },
] as const

export const HIJRI_MONTHS = [
  'محرم',
  'صفر',
  'ربيع الأول',
  'ربيع الآخر',
  'جمادى الأولى',
  'جمادى الآخرة',
  'رجب',
  'شعبان',
  'رمضان',
  'شوال',
  'ذو القعدة',
  'ذو الحجة',
] as const

export const MONTHS_AR = [
  'يناير',
  'فبراير',
  'مارس',
  'أبريل',
  'مايو',
  'يونيو',
  'يوليو',
  'أغسطس',
  'سبتمبر',
  'أكتوبر',
  'نوفمبر',
  'ديسمبر',
] as const

export const defaultData = (): AppData => ({
  version: 1,
  settings: {
    name: 'صندوق الجمعية',
    monthlyAmount: 0,
    currency: 'SAR',
    openingBalance: 0,
    calendar: 'gregorian',
  },
  members: [],
  payments: [],
  expenses: [],
})
