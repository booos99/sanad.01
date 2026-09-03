import { useState, type FormEvent } from 'react'
import { DateField } from '../DateField'
import { DualDate } from '../DualDate'
import { formatMoney, todayIso } from '../format'
import { Modal, ModalForm } from '../Modal'
import { useStore } from '../store'

export function ExpensesPage() {
  const { data, addExpense, deleteExpense } = useStore()
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState(todayIso())
  const ordered = [...data.expenses].sort((a, b) => b.date.localeCompare(a.date))

  function submit(event: FormEvent) {
    event.preventDefault()
    const value = Number(amount)
    if (!title.trim() || !Number.isFinite(value) || value <= 0) return
    addExpense(title, value, date)
    setTitle('')
    setAmount('')
    setDate(todayIso())
    setOpen(false)
  }

  return (
    <div className="page">
      <header className="page-head row">
        <div>
          <p className="eyebrow">المصروفات</p>
          <h1>حركات الصرف</h1>
        </div>
        <button type="button" className="btn compact" onClick={() => setOpen(true)}>
          إضافة
        </button>
      </header>

      {ordered.length === 0 ? (
        <section className="card empty">
          <p>لا توجد مصروفات. سجّل أي مبلغ يخرج من الصندوق مع تاريخه.</p>
        </section>
      ) : (
        <ul className="list">
          {ordered.map((expense) => (
            <li key={expense.id} className="list-card">
              <div>
                <strong>{expense.title}</strong>
                <DualDate isoDate={expense.date} />
                <span className="amount-out">
                  − {formatMoney(expense.amount, data.settings.currency)}
                </span>
              </div>
              <button
                type="button"
                className="text-danger"
                onClick={() => {
                  if (confirm('حذف هذا المصروف؟')) deleteExpense(expense.id)
                }}
              >
                حذف
              </button>
            </li>
          ))}
        </ul>
      )}

      {open && (
        <Modal title="مصروف جديد" onClose={() => setOpen(false)}>
          <ModalForm onSubmit={submit}>
            <label>
              البيان
              <input value={title} onChange={(e) => setTitle(e.target.value)} required placeholder="مثال: كهرباء" />
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
