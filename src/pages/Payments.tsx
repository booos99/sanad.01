import { useState, type FormEvent } from 'react'
import { DateField } from '../DateField'
import { DualDate } from '../DualDate'
import { currentYearMonth, formatMoney, formatMonthBoth, todayIso } from '../format'
import { Modal, ModalForm } from '../Modal'
import { monthPayments, paymentStatus, remainingOf, useStore } from '../store'
import { MONTHS_AR, type AppData, type Member } from '../types'

export function PaymentsPage() {
  const now = currentYearMonth()
  const [year, setYear] = useState(now.year)
  const [month, setMonth] = useState(now.month)
  const { data, setPayment, unmarkPaid, canEdit } = useStore()
  const due = data.settings.monthlyAmount
  const currency = data.settings.currency
  const payments = monthPayments(data, year, month)
  const byMember = new Map(payments.map((payment) => [payment.memberId, payment]))
  const years = yearOptions(data, now.year)
  const monthLabel = formatMonthBoth(year, month)
  const [editing, setEditing] = useState<Member | null>(null)
  const [amount, setAmount] = useState('')
  const [paidOn, setPaidOn] = useState(todayIso())

  function openEditor(member: Member) {
    const payment = byMember.get(member.id)
    setEditing(member)
    setAmount(String(payment?.amount ?? due))
    setPaidOn(payment?.date ?? todayIso())
  }

  function savePayment(event: FormEvent) {
    event.preventDefault()
    if (!editing) return
    const value = Number(amount)
    if (!Number.isFinite(value) || value < 0) return
    setPayment(editing.id, year, month, paidOn, value)
    setEditing(null)
  }

  return (
    <div className="page">
      <header className="page-head">
        <p className="eyebrow">الاشتراكات</p>
        <h1>دفعات الشهر</h1>
      </header>

      <section className="card filters">
        <label>
          الشهر
          <select value={month} onChange={(e) => setMonth(Number(e.target.value))}>
            {MONTHS_AR.map((label, index) => (
              <option key={label} value={index + 1}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label>
          السنة
          <select value={year} onChange={(e) => setYear(Number(e.target.value))}>
            {years.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
        {monthLabel.hijri ? <p className="month-hijri span-2">{monthLabel.hijri}</p> : null}
      </section>

      {due <= 0 && canEdit && <p className="banner">حدد المبلغ الشهري من الإعدادات قبل تسجيل الدفعات.</p>}
      {due > 0 && canEdit ? (
        <p className="hint-tap">اضغط العضو لتسجيل المبلغ وتحديد يوم وشهر وسنة الدفع.</p>
      ) : null}

      {data.members.length === 0 ? (
        <section className="card empty">
          <p>أضف أعضاء أولاً حتى تتمكن من تسجيل الاشتراكات.</p>
        </section>
      ) : (
        <ul className="list">
          {data.members.map((member) => {
            const payment = byMember.get(member.id)
            const paid = payment?.amount ?? 0
            const remaining = remainingOf(paid, due)
            const status = paymentStatus(paid, due)
            return (
              <li key={member.id} className="list-card">
                <button
                  type="button"
                  className="list-card-main"
                  disabled={!canEdit || due <= 0}
                  onClick={() => openEditor(member)}
                >
                  <strong>{member.name}</strong>
                  <span className="muted">المستحق {formatMoney(due, currency)}</span>
                  {paid > 0 ? (
                    <>
                      <span className="paid-total">دُفع {formatMoney(paid, currency)}</span>
                      <span className={remaining > 0 ? 'remain' : 'muted'}>
                        المتبقي {formatMoney(remaining, currency)}
                      </span>
                      <span className="muted">تاريخ الدفع</span>
                      {payment ? <DualDate isoDate={payment.date} /> : null}
                    </>
                  ) : (
                    <span className="remain">المتبقي {formatMoney(due, currency)}</span>
                  )}
                  <span className={`pill ${statusClass(status)}`}>{statusLabel(status)}</span>
                </button>
                {canEdit ? (
                  <div className="row-actions">
                    <button
                      type="button"
                      className="btn compact"
                      disabled={due <= 0}
                      onClick={() => openEditor(member)}
                    >
                      {paid > 0 ? 'تعديل' : 'دفع'}
                    </button>
                    {paid > 0 ? (
                      <button
                        type="button"
                        className="text-danger"
                        onClick={() => unmarkPaid(member.id, year, month)}
                      >
                        إلغاء
                      </button>
                    ) : null}
                  </div>
                ) : null}
              </li>
            )
          })}
        </ul>
      )}

      {editing && canEdit && (
        <Modal title={`دفعة ${editing.name}`} onClose={() => setEditing(null)}>
          <ModalForm onSubmit={savePayment}>
            <p className="muted">
              اشتراك {monthLabel.gregorian}
              {monthLabel.hijri ? ` — ${monthLabel.hijri}` : ''}
            </p>
            <p className="muted">المستحق {formatMoney(due, currency)}</p>
            <DateField label="تاريخ الدفع" value={paidOn} onChange={setPaidOn} />
            <label>
              المبلغ المدفوع
              <input
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
            </label>
            <button type="submit" className="btn">
              حفظ الدفعة
            </button>
          </ModalForm>
        </Modal>
      )}
    </div>
  )
}

function statusLabel(status: 'none' | 'partial' | 'full'): string {
  if (status === 'full') return 'مكتمل'
  if (status === 'partial') return 'مدفوع جزئياً'
  return 'لم يسدد'
}

function statusClass(status: 'none' | 'partial' | 'full'): string {
  if (status === 'full') return 'ok'
  if (status === 'partial') return 'partial'
  return 'wait'
}

function yearOptions(data: AppData, current: number): number[] {
  const years = new Set([current - 2, current - 1, current, current + 1])
  for (const payment of data.payments) {
    if (Number.isFinite(payment.year)) years.add(payment.year)
  }
  return [...years].sort((a, b) => a - b)
}
