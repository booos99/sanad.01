import { useState, type FormEvent } from 'react'
import { DateField } from '../DateField'
import { DualDate } from '../DualDate'
import { formatMoney, todayIso } from '../format'
import { Modal, ModalForm } from '../Modal'
import { useStore } from '../store'
import type { Expense } from '../types'

export function ExpensesPage() {
  const { data, addExpense, updateExpense, deleteExpense, canEdit } = useStore()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Expense | null>(null)
  const [title, setTitle] = useState('')
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState(todayIso())
  const ordered = [...data.expenses].sort((a, b) => b.date.localeCompare(a.date))

  function resetForm() {
    setTitle('')
    setAmount('')
    setDate(todayIso())
  }

  function openCreate() {
    setEditing(null)
    resetForm()
    setOpen(true)
  }

  function openEdit(expense: Expense) {
    setEditing(expense)
    setTitle(expense.title)
    setAmount(String(expense.amount))
    setDate(expense.date)
    setOpen(true)
  }

  function closeModal() {
    setOpen(false)
    setEditing(null)
    resetForm()
  }

  function submit(event: FormEvent) {
    event.preventDefault()
    const value = Number(amount)
    if (!title.trim() || !Number.isFinite(value) || value <= 0) return
    if (editing) {
      updateExpense(editing.id, title, value, date)
    } else {
      addExpense(title, value, date)
    }
    closeModal()
  }

  return (
    <div className="page">
      <header className="page-head row">
        <div>
          <p className="eyebrow">المصروفات</p>
          <h1>حركات الصرف</h1>
        </div>
        {canEdit ? (
          <button type="button" className="btn compact" onClick={openCreate}>
            إضافة
          </button>
        ) : null}
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
              {canEdit ? (
                <div className="row-actions">
                  <button type="button" className="btn compact" onClick={() => openEdit(expense)}>
                    تعديل
                  </button>
                  <button
                    type="button"
                    className="text-danger"
                    onClick={() => {
                      if (confirm('حذف هذا المصروف؟')) deleteExpense(expense.id)
                    }}
                  >
                    حذف
                  </button>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      {open && canEdit && (
        <Modal title={editing ? 'تعديل مصروف' : 'مصروف جديد'} onClose={closeModal}>
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
              {editing ? 'حفظ التعديل' : 'حفظ المصروف'}
            </button>
          </ModalForm>
        </Modal>
      )}
    </div>
  )
}
