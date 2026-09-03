import { useRef, useState, type ChangeEvent } from 'react'
import { shareBackup } from '../shareBackup'
import { downloadBackup } from '../storage'
import { useStore } from '../store'
import { CURRENCIES, type Tab } from '../types'

type Props = {
  onNavigate: (tab: Tab) => void
}

export function SettingsPage({ onNavigate }: Props) {
  const { data, updateSettings, importFromText } = useStore()
  const fileRef = useRef<HTMLInputElement>(null)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  async function onShare() {
    setError('')
    try {
      const result = await shareBackup(data)
      setMessage(
        result === 'shared'
          ? 'اختر واتساب من قائمة المشاركة لإرسال الملف مباشرة.'
          : 'تعذر فتح القائمة، فتم تنزيل الملف. أرفقه من الملفات في واتساب.',
      )
    } catch {
      setError('تعذر فتح المشاركة. استخدم تصدير النسخة ثم أرفق الملف من واتساب.')
    }
  }

  function onExport() {
    const name = downloadBackup(data)
    setError('')
    setMessage(`تم تجهيز الملف: ${name}`)
  }

  async function onImport(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    try {
      const text = await file.text()
      if (!confirm('استيراد النسخة يستبدل البيانات الحالية على هذا الجهاز. متابعة؟')) return
      importFromText(text)
      setError('')
      setMessage('تم استيراد النسخة بنجاح.')
    } catch {
      setError('الملف غير صالح. اختر نسخة JSON مصدرة من هذا البرنامج.')
    }
  }

  return (
    <div className="page">
      <header className="page-head">
        <p className="eyebrow">الإعدادات</p>
        <h1>صندوق الجمعية</h1>
      </header>

      <section className="card stack">
        <label>
          اسم الجمعية
          <input
            value={data.settings.name}
            onChange={(e) => updateSettings({ name: e.target.value })}
          />
        </label>
        <label>
          المبلغ الشهري لكل عضو
          <AmountInput
            min="0"
            value={data.settings.monthlyAmount}
            onChange={(monthlyAmount) => updateSettings({ monthlyAmount })}
          />
        </label>
        <label>
          العملة
          <select
            value={data.settings.currency}
            onChange={(e) => updateSettings({ currency: e.target.value })}
          >
            {CURRENCIES.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          الرصيد الافتتاحي
          <AmountInput
            step="0.01"
            value={data.settings.openingBalance}
            onChange={(openingBalance) => updateSettings({ openingBalance })}
          />
        </label>
      </section>

      <section className="card stack">
        <h2>الطباعة</h2>
        <p className="muted">اختر الجداول ثم اطبع أو احفظ كملف PDF من سفاري.</p>
        <button type="button" className="btn" onClick={() => onNavigate('print')}>
          طباعة التقارير
        </button>
      </section>

      <section className="card stack">
        <h2>نسخة البيانات</h2>
        <p className="muted">
          البيانات على هذا الجوال فقط. اضغط المشاركة لتظهر القائمة وتختار واتساب مباشرة دون تنزيل الملف أولاً.
        </p>
        <button type="button" className="btn" onClick={onExport}>
          تصدير نسخة
        </button>
        <button type="button" className="btn whatsapp" onClick={() => void onShare()}>
          <ShareIcon />
          مشاركة عبر واتساب
        </button>
        <button type="button" className="btn ghost" onClick={() => fileRef.current?.click()}>
          استيراد نسخة
        </button>
        <input
          ref={fileRef}
          type="file"
          accept=".json,.txt,application/json,text/plain"
          className="hidden"
          onChange={(e) => void onImport(e)}
        />
        {message ? <p className="ok-msg">{message}</p> : null}
        {error ? <p className="err-msg">{error}</p> : null}
      </section>
    </div>
  )
}

function AmountInput({
  value,
  onChange,
  min,
  step = '0.01',
}: {
  value: number
  onChange: (value: number) => void
  min?: string
  step?: string
}) {
  const [draft, setDraft] = useState<string | null>(null)
  const shown = draft ?? (value === 0 ? '' : String(value))

  return (
    <input
      type="number"
      inputMode="decimal"
      min={min}
      step={step}
      value={shown}
      onFocus={() => setDraft(value === 0 ? '' : String(value))}
      onBlur={() => setDraft(null)}
      onChange={(event) => {
        const text = event.target.value
        setDraft(text)
        if (text === '' || text === '-' || text === '.' || text === '-.') {
          onChange(0)
          return
        }
        const next = Number(text)
        if (Number.isFinite(next)) onChange(next)
      }}
    />
  )
}

function ShareIcon() {
  return (
    <svg className="btn-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 4v10M8.5 7.5 12 4l3.5 3.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M6 12v7a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-7"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
