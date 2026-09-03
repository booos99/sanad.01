import { useState, type ReactNode } from 'react'
import { formatCompact, todayIso } from './format'
import { ExpensesPage } from './pages/Expenses'
import { HomePage } from './pages/Home'
import { LoginPage } from './pages/Login'
import { MembersPage } from './pages/Members'
import { PaymentsPage } from './pages/Payments'
import { PrintPage } from './pages/Print'
import { SettingsPage } from './pages/Settings'
import { StoreProvider, useStore } from './store'
import type { Tab } from './types'

const TABS: { id: Tab; label: string; icon: ReactNode }[] = [
  { id: 'home', label: 'الرئيسية', icon: <HomeIcon /> },
  { id: 'members', label: 'الأعضاء', icon: <PeopleIcon /> },
  { id: 'payments', label: 'الاشتراك', icon: <CoinIcon /> },
  { id: 'expenses', label: 'المصروف', icon: <OutIcon /> },
  { id: 'settings', label: 'إعدادات', icon: <GearIcon /> },
]

export default function App() {
  return (
    <StoreProvider>
      <AppShell />
    </StoreProvider>
  )
}

function AppShell() {
  const [entered, setEntered] = useState(false)
  const [tab, setTab] = useState<Tab>('home')
  const { data, calendar, setCalendar } = useStore()

  if (!entered) {
    return (
      <div className="shell">
        <LoginPage associationName={data.settings.name} onEnter={() => setEntered(true)} />
      </div>
    )
  }

  return (
    <div className="shell">
      <header className="topbar">
        <div className="topbar-row">
          <div className="topbar-text">
            <p>صندوق عائلي</p>
            <h1>{data.settings.name}</h1>
          </div>
          <div className="cal-switch" role="tablist" aria-label="التقويم">
            <button
              type="button"
              role="tab"
              aria-selected={calendar === 'hijri'}
              className={calendar === 'hijri' ? 'on' : ''}
              onClick={() => setCalendar('hijri')}
            >
              هجري
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={calendar === 'gregorian'}
              className={calendar === 'gregorian' ? 'on' : ''}
              onClick={() => setCalendar('gregorian')}
            >
              ميلادي
            </button>
          </div>
        </div>
        <p className="topbar-date">{formatCompact(todayIso(), calendar)}</p>
      </header>

      <main className="main">
        {tab === 'home' && <HomePage onNavigate={setTab} />}
        {tab === 'members' && <MembersPage />}
        {tab === 'payments' && <PaymentsPage />}
        {tab === 'expenses' && <ExpensesPage />}
        {tab === 'settings' && <SettingsPage onNavigate={setTab} />}
        {tab === 'print' && <PrintPage onNavigate={setTab} />}
      </main>

      <nav className="tabbar" aria-label="التنقل">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            className={tab === item.id || (tab === 'print' && item.id === 'settings') ? 'active' : ''}
            onClick={() => setTab(item.id)}
          >
            <span className="tab-icon" aria-hidden="true">
              {item.icon}
            </span>
            {item.label}
          </button>
        ))}
      </nav>
    </div>
  )
}

function HomeIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1z" />
    </svg>
  )
}

function PeopleIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="9" cy="8" r="3" />
      <path d="M4 19c.6-3 2.6-5 5-5s4.4 2 5 5" />
      <circle cx="17" cy="9" r="2.4" />
      <path d="M16 19c.4-2.2 1.7-3.6 3.4-4" />
    </svg>
  )
}

function CoinIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <ellipse cx="12" cy="7" rx="7" ry="3" />
      <path d="M5 7v5c0 1.7 3.1 3 7 3s7-1.3 7-3V7" />
      <path d="M5 12v5c0 1.7 3.1 3 7 3s7-1.3 7-3v-5" />
    </svg>
  )
}

function OutIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 12h16M14 6l6 6-6 6" />
    </svg>
  )
}

function GearIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="3" />
      <path d="M12 3v2M12 19v2M4.9 6.5l1.4 1.4M17.7 16.1l1.4 1.4M3 12h2M19 12h2M4.9 17.5l1.4-1.4M17.7 7.9l1.4-1.4" />
    </svg>
  )
}
