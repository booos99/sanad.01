import { useState, type FormEvent } from 'react'
import { isValidPin, normalizePin } from '../auth'
import { useStore } from '../store'

export function LoginPage() {
  const { data, pinReady, guestEnabled, setupPin, loginAdmin, loginGuest } = useStore()
  const [pin, setPin] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function onSetup(event: FormEvent) {
    event.preventDefault()
    const next = normalizePin(pin)
    const again = normalizePin(confirm)
    if (!isValidPin(next)) {
      setError('الرقم السري من 4 إلى 8 أرقام.')
      return
    }
    if (next !== again) {
      setError('الرقمان غير متطابقين.')
      return
    }
    setBusy(true)
    setError('')
    try {
      await setupPin(next)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'تعذر حفظ الرقم السري.')
    } finally {
      setBusy(false)
    }
  }

  async function onAdmin(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      const ok = await loginAdmin(pin)
      if (!ok) setError('الرقم السري غير صحيح.')
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'تعذر الدخول.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="login">
      <div className="login-glow" aria-hidden="true" />

      <header className="login-brand">
        <div className="login-mark" aria-hidden="true">
          <svg width="88" height="88" viewBox="0 0 180 180">
            <rect width="180" height="180" rx="40" fill="#1f6f62" />
            <rect x="38" y="58" width="104" height="74" rx="16" fill="#fffdf8" />
            <path
              d="M54 58c0-18 16-32 36-32s36 14 36 32"
              fill="none"
              stroke="#c4a35a"
              strokeWidth="10"
              strokeLinecap="round"
            />
            <circle cx="90" cy="95" r="14" fill="#1f6f62" />
            <path d="M84 95h12M90 89v12" stroke="#fffdf8" strokeWidth="4" strokeLinecap="round" />
          </svg>
        </div>
        <p className="login-kicker">صندوق عائلي</p>
        <h1>{data.settings.name}</h1>
        <p className="login-sub">
          {pinReady ? 'أدخل الرقم السري للمتابعة' : 'إعداد الدخول لأول مرة'}
        </p>
      </header>

      <div className="login-panel">
        {!pinReady ? (
          <form className="login-form" onSubmit={(event) => void onSetup(event)}>
            <p className="muted login-lead">
              أنشئ رقماً سرياً للمسؤول قبل استخدام الصندوق. يمكنك لاحقاً السماح بدخول الزائر أو تعطيله من
              الإعدادات.
            </p>
            <label>
              الرقم السري
              <input
                className="pin-input"
                value={pin}
                onChange={(event) => setPin(normalizePin(event.target.value))}
                inputMode="numeric"
                autoComplete="new-password"
                maxLength={8}
                placeholder="٤ إلى ٨ أرقام"
                required
              />
            </label>
            <label>
              تأكيد الرقم
              <input
                className="pin-input"
                value={confirm}
                onChange={(event) => setConfirm(normalizePin(event.target.value))}
                inputMode="numeric"
                autoComplete="new-password"
                maxLength={8}
                required
              />
            </label>
            {error ? <p className="err-msg">{error}</p> : null}
            <button type="submit" className="btn add-wide" disabled={busy}>
              حفظ ودخول كمسؤول
            </button>
          </form>
        ) : (
          <form className="login-form" onSubmit={(event) => void onAdmin(event)}>
            <label>
              الرقم السري للمسؤول
              <input
                className="pin-input"
                value={pin}
                onChange={(event) => setPin(normalizePin(event.target.value))}
                inputMode="numeric"
                autoComplete="current-password"
                maxLength={8}
                placeholder="••••"
                required
                autoFocus
              />
            </label>
            {error ? <p className="err-msg">{error}</p> : null}
            <div className="login-actions">
              <button type="submit" className="btn add-wide" disabled={busy}>
                دخول المسؤول
              </button>
              {guestEnabled ? (
                <button type="button" className="btn ghost add-wide" disabled={busy} onClick={loginGuest}>
                  دخول كزائر للمراجعة
                </button>
              ) : (
                <p className="muted login-lead login-guest-off">دخول الزائر معطّل من الإعدادات.</p>
              )}
            </div>
          </form>
        )}
      </div>

      <details className="login-hint">
        <summary>إضافة للشاشة الرئيسية</summary>
        <ol>
          <li>افتح الرابط من سفاري بشرط يبدأ بـ https وليس http</li>
          <li>احذف أي أيقونة قديمة أُضيفت من رابط الماك</li>
          <li>زر المشاركة ثم «إضافة إلى الشاشة الرئيسية»</li>
        </ol>
      </details>
    </div>
  )
}
