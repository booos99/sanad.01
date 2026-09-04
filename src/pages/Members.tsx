import { useState, type FormEvent } from 'react'
import { DateField } from '../DateField'
import { DualDate } from '../DualDate'
import { currentYearMonth, formatMoney, formatMonthBoth, todayIso } from '../format'
import { Modal, ModalForm } from '../Modal'
import {
  memberPaidTotal,
  memberPayments,
  monthPayments,
  paymentStatus,
  remainingOf,
  useStore,
} from '../store'
import type { Member } from '../types'

const OPEN_ADD_KEY = 'jamia-open-add-member'

export function MembersPage() {
  const { data, addMember, deleteMember, calendar, canEdit } = useStore()
  const [open, setOpen] = useState(() => canEdit && shouldOpenAddMember())
  const [viewing, setViewing] = useState<Member | null>(null)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [joinedAt, setJoinedAt] = useState(todayIso())
  const { year, month } = currentYearMonth()
  const viewed = viewing ? data.members.find((item) => item.id === viewing.id) ?? null : null

  function submit(event: FormEvent) {
    event.preventDefault()
    if (!name.trim()) return
    addMember(name, phone, joinedAt)
    setName('')
    setPhone('')
    setJoinedAt(todayIso())
    setOpen(false)
  }

  if (viewed) {
    const payments = memberPayments(data, viewed.id)
    const due = data.settings.monthlyAmount
    const currency = data.settings.currency
    return (
      <div className="page">
        <header className="page-head row">
          <div>
            <p className="eyebrow">سجل العضو</p>
            <h1>{viewed.name}</h1>
          </div>
          <button type="button" className="btn ghost compact" onClick={() => setViewing(null)}>
            رجوع
          </button>
        </header>

        <section className="card stack">
          {viewed.phone ? <p className="muted">{viewed.phone}</p> : null}
          <p className="paid-total">المجموع {formatMoney(memberPaidTotal(data, viewed.id), currency)}</p>
          <p className="muted">تاريخ الانضمام</p>
          <DualDate isoDate={viewed.createdAt} />
        </section>

        <h2 className="section-title">الشهور التي دفعها</h2>
        {payments.length === 0 ? (
          <section className="card empty">
            <p>لا توجد دفعات مسجلة لهذا العضو بعد.</p>
          </section>
        ) : (
          <ul className="list">
            {payments.map((payment) => {
              const monthLabel = formatMonthBoth(payment.year, payment.month)
              const primary = calendar === 'hijri' ? monthLabel.hijri || monthLabel.gregorian : monthLabel.gregorian
              const secondary = calendar === 'hijri' ? monthLabel.gregorian : monthLabel.hijri
              const remaining = remainingOf(payment.amount, due)
              const status = paymentStatus(payment.amount, due)
              return (
                <li key={payment.id} className="list-card">
                  <div>
                    <strong>{primary}</strong>
                    {secondary ? <span className="muted">{secondary}</span> : null}
                    <span className="paid-total">{formatMoney(payment.amount, currency)}</span>
                    {remaining > 0 ? (
                      <span className="remain">المتبقي {formatMoney(remaining, currency)}</span>
                    ) : null}
                    <span className="muted">تاريخ الدفع</span>
                    <DualDate isoDate={payment.date} />
                    <span className={`pill ${status === 'full' ? 'ok' : status === 'partial' ? 'partial' : 'wait'}`}>
                      {status === 'full' ? 'مكتمل' : status === 'partial' ? 'مدفوع جزئياً' : 'لم يسدد'}
                    </span>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    )
  }

  return (
    <div className="page">
      <header className="page-head row">
        <div>
          <p className="eyebrow">الأعضاء</p>
          <h1>أفراد الجمعية</h1>
        </div>
      </header>

      {canEdit ? (
        <button type="button" className="btn add-wide" onClick={() => setOpen(true)}>
          إضافة عضو
        </button>
      ) : null}

      {data.members.length === 0 ? (
        <section className="card empty">
          <p>{canEdit ? 'لا يوجد أعضاء بعد. اضغط «إضافة عضو» بالأعلى.' : 'لا يوجد أعضاء بعد.'}</p>
        </section>
      ) : (
        <>
          <p className="hint-tap">اضغط اسم العضو لعرض كل الشهور التي دفعها وتاريخ كل دفعة.</p>
          <ul className="list">
            {data.members.map((member) => {
              const total = memberPaidTotal(data, member.id)
              const monthPaid = monthPayments(data, year, month).find((item) => item.memberId === member.id)
              const status = paymentStatus(monthPaid?.amount ?? 0, data.settings.monthlyAmount)
              const remaining = remainingOf(monthPaid?.amount ?? 0, data.settings.monthlyAmount)
              return (
                <li key={member.id} className="list-card">
                  <button type="button" className="list-card-main" onClick={() => setViewing(member)}>
                    <strong>{member.name}</strong>
                    {member.phone ? <span className="muted">{member.phone}</span> : null}
                    <span className="paid-total">المجموع {formatMoney(total, data.settings.currency)}</span>
                    {status === 'partial' ? (
                      <span className="remain">
                        متبقي هذا الشهر {formatMoney(remaining, data.settings.currency)}
                      </span>
                    ) : null}
                    <DualDate isoDate={member.createdAt} />
                    <span className={`pill ${status === 'full' ? 'ok' : status === 'partial' ? 'partial' : 'wait'}`}>
                      {status === 'full' ? 'سدد هذا الشهر' : status === 'partial' ? 'مدفوع جزئياً' : 'لم يسدد هذا الشهر'}
                    </span>
                  </button>
                  {canEdit ? (
                    <button
                      type="button"
                      className="text-danger"
                      onClick={() => {
                        if (confirm(`حذف ${member.name}؟ تُحذف دفعاته أيضاً.`)) {
                          deleteMember(member.id)
                        }
                      }}
                    >
                      حذف
                    </button>
                  ) : null}
                </li>
              )
            })}
          </ul>
        </>
      )}

      {open && canEdit && (
        <Modal title="عضو جديد" onClose={() => setOpen(false)}>
          <ModalForm onSubmit={submit}>
            <label>
              الاسم
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                autoComplete="name"
                enterKeyHint="done"
                placeholder="الاسم الكامل"
              />
            </label>
            <label>
              الجوال (اختياري)
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                inputMode="tel"
                autoComplete="tel"
                placeholder="05xxxxxxxx"
              />
            </label>
            <DateField label="تاريخ الانضمام" value={joinedAt} onChange={setJoinedAt} />
            <button type="submit" className="btn">
              حفظ العضو
            </button>
          </ModalForm>
        </Modal>
      )}

      <p className="footnote">عدد الأعضاء: {data.members.length}</p>
    </div>
  )
}

function shouldOpenAddMember(): boolean {
  try {
    if (sessionStorage.getItem(OPEN_ADD_KEY) !== '1') return false
    sessionStorage.removeItem(OPEN_ADD_KEY)
    return true
  } catch {
    return false
  }
}
