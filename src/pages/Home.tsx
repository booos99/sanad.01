import { useState, type FormEvent } from 'react'
import { DateField } from '../DateField'
import { formatMonthBoth, formatMoney, todayIso } from '../format'
import { Modal, ModalForm } from '../Modal'
import { thisMonthSummary, useStore } from '../store'
import type { Tab } from '../types'

type Props = {
  onNavigate: (tab: Tab) => void
}

export function HomePage({ onNavigate }: Props) {
  const { data, balance, collected, spent, calendar, addExpense, canEdit } = useStore()
  const summary = thisMonthSummary(data)
  const monthLabel = formatMonthBoth(summary.year, summary.month)
  const [expenseOpen, setExpenseOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState(todayIso())
  const primaryMonth = calendar === 'hijri' ? monthLabel.hijri : monthLabel.gregorian
  const secondaryMonth = calendar === 'hijri' ? monthLabel.gregorian : monthLabel.hijri

  function submitExpense(event: FormEvent) {
    event.preventDefault()
    const value = Number(amount)
    if (!title.trim() || !Number.isFinite(value) || value <= 0) return
    addExpense(title, value, date)
    setTitle('')
    setAmount('')
    setDate(todayIso())
    setExpenseOpen(false)
  }

  return (
    <div className="page">
      <section className={`balance-card ${balance < 0 ? 'negative' : ''}`}>
        <p>الرصيد المتوفر</p>
        <strong>{formatMoney(balance, data.settings.currency)}</strong>
        <div className="balance-meta">
          <span>اشتراكات {formatMoney(collected, data.settings.currency)}</span>
          <span>مصروفات {formatMoney(spent, data.settings.currency)}</span>
        </div>
      </section>

      <section className="card">
        <h2>{primaryMonth}</h2>
        {secondaryMonth ? <p className="month-hijri">{secondaryMonth}</p> : null}
        <div className="stat-row">
          <div>
            <b>
              {summary.paidCount} / {summary.memberCount || 0}
            </b>
            <span>اكتمل اشتراكهم</span>
          </div>
          <div>
            <b>{formatMoney(summary.spent, data.settings.currency)}</b>
            <span>مصروف هذا الشهر</span>
          </div>
        </div>
      </section>

      <div className="quick-grid">
        {canEdit ? (
          <button type="button" className="quick" onClick={() => setExpenseOpen(true)}>
            إضافة مصروف
          </button>
        ) : null}
        <button type="button" className="quick ghost" onClick={() => onNavigate('payments')}>
          {canEdit ? 'تسجيل دفعة' : 'الاشتراكات'}
        </button>
        <button type="button" className="quick ghost" onClick={() => onNavigate('members')}>
          الأعضاء
        </button>
        <button type="button" className="quick ghost" onClick={() => onNavigate('print')}>
          طباعة
        </button>
      </div>

      {data.members.length === 0 && canEdit && (
        <section className="card hint">
          <h2>ابدأ من هنا</h2>
          <p>أضف أسماء أفراد الجمعية، ثم حدد المبلغ الشهري من الإعدادات.</p>
          <button
            type="button"
            className="btn"
            onClick={() => {
              try {
                sessionStorage.setItem('jamia-open-add-member', '1')
              } catch {
                /* ignore */
              }
              onNavigate('members')
            }}
          >
            إضافة عضو
          </button>
        </section>
      )}

      {expenseOpen && canEdit && (
        <Modal title="مصروف جديد" onClose={() => setExpenseOpen(false)}>
          <ModalForm onSubmit={submitExpense}>
            <label>
              البيان
              <input value={title} onChange={(e) => setTitle(e.target.value)} required placeholder="مثال: صيانة" />
            </label>
            <label>
              المبلغ
              <input
                type="number"
                inputMode="decimal"
                min="0.01"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
            </label>
            <DateField label="التاريخ" value={date} onChange={setDate} required />
            <button type="submit" className="btn">
              حفظ المصروف
            </button>
          </ModalForm>
        </Modal>
      )}
    </div>
  )
}
