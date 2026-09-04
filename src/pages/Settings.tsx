import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import { isValidPin, normalizePin } from '../auth'
import { formatDateTime } from '../format'
import { shareBackup } from '../shareBackup'
import { downloadBackup } from '../storage'
import { useStore } from '../store'
import { CURRENCIES, type Tab } from '../types'

type Props = {
  onNavigate: (tab: Tab) => void
}

export function SettingsPage({ onNavigate }: Props) {
  const {
    data,
    updateSettings,
    importFromText,
    canEdit,
    backups,
    refreshBackups,
    snapshotNow,
    restoreBackup,
    changePin,
    guestEnabled,
    setGuestEnabled,
  } = useStore()
  const fileRef = useRef<HTMLInputElement>(null)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [currentPin, setCurrentPin] = useState('')
  const [newPin, setNewPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [pinBusy, setPinBusy] = useState(false)

  useEffect(() => {
    void refreshBackups()
  }, [refreshBackups])

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
    if (!file || !canEdit) return
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

  async function onSnapshot() {
    setError('')
    try {
      await snapshotNow()
      setMessage('حُفظت نسخة داخلية الآن.')
    } catch {
      setError('تعذر حفظ النسخة الداخلية.')
    }
  }

  async function onRestore(id: string, createdAt: number) {
    if (!canEdit) return
    if (!confirm(`استعادة نسخة ${formatDateTime(createdAt)}؟ تستبدل البيانات الحالية.`)) return
    setError('')
    try {
      await restoreBackup(id)
      setMessage('تمت استعادة النسخة الداخلية.')
    } catch {
      setError('تعذر استعادة هذه النسخة.')
    }
  }

  async function onChangePin(event: FormEvent) {
    event.preventDefault()
    const current = normalizePin(currentPin)
    const next = normalizePin(newPin)
    const again = normalizePin(confirmPin)
    if (!isValidPin(next)) {
      setError('الرقم الجديد من 4 إلى 8 أرقام.')
      return
    }
    if (next !== again) {
      setError('تأكيد الرقم الجديد غير مطابق.')
      return
    }
    setPinBusy(true)
    setError('')
    try {
      const ok = await changePin(current, next)
      if (!ok) {
        setError('الرقم الحالي غير صحيح.')
        return
      }
      setCurrentPin('')
      setNewPin('')
      setConfirmPin('')
      setMessage('تم تغيير الرقم السري.')
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'تعذر تغيير الرقم السري.')
    } finally {
      setPinBusy(false)
    }
  }

  return (
    <div className="page">
      <header className="page-head">
        <p className="eyebrow">الإعدادات</p>
        <h1>صندوق الجمعية</h1>
      </header>

      {!canEdit ? (
        <p className="banner">وضع المراجعة: يمكنك الاطلاع والتصدير والطباعة دون تعديل.</p>
      ) : null}
      {message ? <p className="ok-msg">{message}</p> : null}
      {error ? <p className="err-msg">{error}</p> : null}

      <section className="card stack">
        <label>
          اسم الجمعية
          <input
            value={data.settings.name}
            disabled={!canEdit}
            onChange={(e) => updateSettings({ name: e.target.value })}
          />
        </label>
        <label>
          المبلغ الشهري لكل عضو
          <AmountInput
            min="0"
            value={data.settings.monthlyAmount}
            disabled={!canEdit}
            onChange={(monthlyAmount) => updateSettings({ monthlyAmount })}
          />
        </label>
        <label>
          العملة
          <select
            value={data.settings.currency}
            disabled={!canEdit}
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
            disabled={!canEdit}
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
        {canEdit ? (
          <button type="button" className="btn ghost" onClick={() => fileRef.current?.click()}>
            استيراد نسخة
          </button>
        ) : null}
        <input
          ref={fileRef}
          type="file"
          accept=".json,.txt,application/json,text/plain"
          className="hidden"
          onChange={(e) => void onImport(e)}
        />
      </section>

      <section className="card stack">
        <h2>النسخ التلقائي</h2>
        <p className="muted">
          تُحفظ نسخة داخل التطبيق بعد كل تعديل، ويُحتفظ بآخر 10 نسخ حتى لو لم تصدّر ملفاً.
        </p>
        {canEdit ? (
          <button type="button" className="btn ghost" onClick={() => void onSnapshot()}>
            حفظ نسخة داخلية الآن
          </button>
        ) : null}
        {backups.length === 0 ? (
          <p className="muted">ستظهر النسخ هنا بعد أول حفظ.</p>
        ) : (
          <ul className="backup-list">
            {backups.map((item) => (
              <li key={item.id} className="backup-row">
                <div>
                  <strong>{formatDateTime(item.createdAt)}</strong>
                  <span className="muted">
                    {item.members} أعضاء · {item.payments} دفعات · {item.expenses} مصروفات
                  </span>
                </div>
                {canEdit ? (
                  <button type="button" className="btn compact ghost" onClick={() => void onRestore(item.id, item.createdAt)}>
                    استعادة
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      {canEdit ? (
        <section className="card stack">
          <h2>دخول الزائر</h2>
          <p className="muted">الزائر يطّلع ويطبع دون تعديل. أزل التحديد لتعطيل زر الزائر في شاشة الدخول.</p>
          <label className="check">
            <input
              type="checkbox"
              checked={guestEnabled}
              onChange={(event) => setGuestEnabled(event.target.checked)}
            />
            السماح بدخول الزائر للمراجعة
          </label>
        </section>
      ) : null}

      {canEdit ? (
        <form className="card stack" onSubmit={(event) => void onChangePin(event)}>
          <h2>الرقم السري</h2>
          <p className="muted">
            إذا نسيت الرقم، امسح بيانات الموقع من سفاري لهذا الرابط ثم أنشئ رقماً جديداً. صدّر نسخة قبل ذلك إن أمكن.
          </p>
          <label>
            الرقم الحالي
            <input
              className="pin-input"
              value={currentPin}
              onChange={(event) => setCurrentPin(normalizePin(event.target.value))}
              inputMode="numeric"
              autoComplete="current-password"
              maxLength={8}
              required
            />
          </label>
          <label>
            الرقم الجديد
            <input
              className="pin-input"
              value={newPin}
              onChange={(event) => setNewPin(normalizePin(event.target.value))}
              inputMode="numeric"
              autoComplete="new-password"
              maxLength={8}
              required
            />
          </label>
          <label>
            تأكيد الرقم الجديد
            <input
              className="pin-input"
              value={confirmPin}
              onChange={(event) => setConfirmPin(normalizePin(event.target.value))}
              inputMode="numeric"
              autoComplete="new-password"
              maxLength={8}
              required
            />
          </label>
          <button type="submit" className="btn" disabled={pinBusy}>
            تغيير الرقم السري
          </button>
        </form>
      ) : null}
    </div>
  )
}

function AmountInput({
  value,
  onChange,
  min,
  step = '0.01',
  disabled = false,
}: {
  value: number
  onChange: (value: number) => void
  min?: string
  step?: string
  disabled?: boolean
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
      disabled={disabled}
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
