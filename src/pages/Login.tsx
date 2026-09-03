type Props = {
  associationName: string
  onEnter: () => void
}

export function LoginPage({ associationName, onEnter }: Props) {
  return (
    <div className="login">
      <div className="login-mark" aria-hidden="true">
        <svg width="64" height="64" viewBox="0 0 180 180">
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
        </svg>
      </div>
      <p className="login-kicker">صندوق عائلي</p>
      <h1>{associationName}</h1>

      <section className="card hint login-hint">
        <h2>إضافة للشاشة الرئيسية</h2>
        <ol>
          <li>افتح الرابط من سفاري بشرط يبدأ بـ https وليس http</li>
          <li>احذف أي أيقونة قديمة أُضيفت من رابط الماك</li>
          <li>زر المشاركة ثم «إضافة إلى الشاشة الرئيسية»</li>
        </ol>
      </section>

      <button type="button" className="btn add-wide" onClick={onEnter}>
        دخول
      </button>
    </div>
  )
}
