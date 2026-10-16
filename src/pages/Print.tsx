import { useMemo, useState } from 'react'
import { DualDate } from '../DualDate'
import { currentYearMonth, formatDate, formatMoney, formatMonthBoth, parseIsoDate, todayIso } from '../format'
import { memberPaidTotal, paymentStatus, remainingOf, useStore } from '../store'
import { MONTHS_AR, type AppData, type Member, type Tab } from '../types'

type Props = {
  onNavigate: (tab: Tab) => void
}

type PaymentRow = {
  memberId: string
  member: string
  year: number
  month: number
  due: number
  paid: number
  extra: number
  received: number
  remaining: number
  status: 'none' | 'partial' | 'full'
  date: string
}

export function PrintPage({ onNavigate }: Props) {
  const now = currentYearMonth()
  const { data, balance, collected, spent, calendar } = useStore()
  const due = data.settings.monthlyAmount
  const currency = data.settings.currency
  const [expensesOn, setExpensesOn] = useState(true)
  const [balanceOn, setBalanceOn] = useState(true)
  const [paymentsOn, setPaymentsOn] = useState(true)
  const [memberDetailOn, setMemberDetailOn] = useState(false)
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([])
  const [scope, setScope] = useState<'month' | 'all'>('month')
  const [year, setYear] = useState(now.year)
  const [month, setMonth] = useState(now.month)
  const years = yearOptions(data, now.year)
  const monthTitle = formatMonthBoth(year, month)
  const selected = expensesOn || balanceOn || paymentsOn || memberDetailOn
  const filterActive = selectedMemberIds.length > 0
  const reportMembers = useMemo(
    () =>
      filterActive
        ? data.members.filter((member) => selectedMemberIds.includes(member.id))
        : data.members,
    [data.members, filterActive, selectedMemberIds],
  )
  const periodLabel =
    scope === 'all'
      ? 'تقرير كل الشهور'
      : calendar === 'hijri'
        ? monthTitle.hijri || monthTitle.gregorian
        : monthTitle.gregorian

  const expenseRows = useMemo(() => {
    const rows = [...data.expenses].sort((a, b) => a.date.localeCompare(b.date))
    if (scope === 'all') return rows
    const prefix = `${year}-${String(month).padStart(2, '0')}`
    return rows.filter((item) => item.date.startsWith(prefix))
  }, [data.expenses, month, scope, year])

  const paymentRows = useMemo(() => {
    const months = scope === 'all' || memberDetailOn ? reportMonths(data) : [{ year, month }]
    const members = reportMembers
    return months.flatMap((item) =>
      members.map((member) => {
        const payment = data.payments.find(
          (row) => row.memberId === member.id && row.year === item.year && row.month === item.month,
        )
        const paid = payment?.amount ?? 0
        const extra = payment?.extraAmount ?? 0
        return {
          memberId: member.id,
          member: member.name,
          year: item.year,
          month: item.month,
          due,
          paid,
          extra,
          received: paid + extra,
          remaining: remainingOf(paid, due),
          status: paymentStatus(paid, due),
          date: payment?.date ?? '',
        } satisfies PaymentRow
      }),
    )
  }, [data, due, memberDetailOn, month, reportMembers, scope, year])

  function applyPreset(
    kind: 'expenses' | 'expenses-balance' | 'payments-month' | 'payments-all' | 'members-detail',
  ) {
    if (kind === 'expenses') {
      setExpensesOn(true)
      setBalanceOn(false)
      setPaymentsOn(false)
      setMemberDetailOn(false)
      return
    }
    if (kind === 'expenses-balance') {
      setExpensesOn(true)
      setBalanceOn(true)
      setPaymentsOn(false)
      setMemberDetailOn(false)
      return
    }
    if (kind === 'payments-month') {
      setExpensesOn(false)
      setBalanceOn(false)
      setPaymentsOn(true)
      setMemberDetailOn(false)
      setScope('month')
      return
    }
    if (kind === 'payments-all') {
      setExpensesOn(false)
      setBalanceOn(false)
      setPaymentsOn(true)
      setMemberDetailOn(false)
      setScope('all')
      return
    }
    setExpensesOn(false)
    setBalanceOn(false)
    setPaymentsOn(false)
    setMemberDetailOn(true)
    setScope('all')
  }

  function toggleMember(id: string) {
    setSelectedMemberIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    )
  }

  function selectAllMembers() {
    setSelectedMemberIds(data.members.map((member) => member.id))
  }

  function clearMemberSelection() {
    setSelectedMemberIds([])
  }

  function printNow() {
    if (!selected) return
    if (memberDetailOn && reportMembers.length === 0) return
    window.print()
  }

  const canPrint =
    selected &&
    (!memberDetailOn || reportMembers.length > 0) &&
    (!filterActive || reportMembers.length > 0)

  return (
    <div className="page print-page">
      <header className="page-head row print-controls">
        <div>
          <p className="eyebrow">التقارير</p>
          <h1>طباعة جداول</h1>
        </div>
        <button type="button" className="btn ghost compact" onClick={() => onNavigate('settings')}>
          رجوع
        </button>
      </header>

      <section className="card stack print-controls">
        <p className="muted">اختر ماذا يظهر في الملف، ثم اضغط طباعة. من سفاري يمكن حفظه PDF.</p>
        <div className="preset-grid">
          <button type="button" className="btn ghost compact" onClick={() => applyPreset('expenses')}>
            المصروفات فقط
          </button>
          <button type="button" className="btn ghost compact" onClick={() => applyPreset('expenses-balance')}>
            المصروفات والمتبقي
          </button>
          <button type="button" className="btn ghost compact" onClick={() => applyPreset('payments-month')}>
            مدفوعات شهر واحد
          </button>
          <button type="button" className="btn ghost compact" onClick={() => applyPreset('payments-all')}>
            مدفوعات كل الشهور
          </button>
          <button
            type="button"
            className="btn ghost compact span-2"
            onClick={() => applyPreset('members-detail')}
          >
            تقرير مفصّل لعضو أو أكثر
          </button>
        </div>
        <label className="check">
          <input type="checkbox" checked={expensesOn} onChange={(e) => setExpensesOn(e.target.checked)} />
          جدول المصروفات
        </label>
        <label className="check">
          <input type="checkbox" checked={balanceOn} onChange={(e) => setBalanceOn(e.target.checked)} />
          المتبقي في الصندوق والرصيد
        </label>
        <label className="check">
          <input
            type="checkbox"
            checked={paymentsOn}
            onChange={(e) => {
              setPaymentsOn(e.target.checked)
              if (e.target.checked) setMemberDetailOn(false)
            }}
          />
          مدفوعات الأعضاء
        </label>
        <label className="check">
          <input
            type="checkbox"
            checked={memberDetailOn}
            onChange={(e) => {
              setMemberDetailOn(e.target.checked)
              if (e.target.checked) {
                setPaymentsOn(false)
                setScope('all')
              }
            }}
          />
          تقرير مفصّل لعضو أو أكثر
        </label>

        {(paymentsOn || memberDetailOn) && data.members.length > 0 ? (
          <div className="member-filter">
            <div className="member-filter-head">
              <p className="muted">
                {filterActive
                  ? `محدد: ${selectedMemberIds.length} من ${data.members.length}`
                  : 'كل الأعضاء (أو اختر عضواً واحداً أو أكثر)'}
              </p>
              <div className="row-actions">
                <button type="button" className="btn ghost compact" onClick={selectAllMembers}>
                  تحديد الكل
                </button>
                <button type="button" className="btn ghost compact" onClick={clearMemberSelection}>
                  إلغاء التحديد
                </button>
              </div>
            </div>
            <div className="member-check-list">
              {data.members.map((member) => (
                <label key={member.id} className="check member-check">
                  <input
                    type="checkbox"
                    checked={selectedMemberIds.includes(member.id)}
                    onChange={() => toggleMember(member.id)}
                  />
                  {member.name}
                </label>
              ))}
            </div>
          </div>
        ) : null}

        {!memberDetailOn ? (
          <label>
            نطاق التقرير
            <select value={scope} onChange={(e) => setScope(e.target.value as 'month' | 'all')}>
              <option value="month">شهر واحد</option>
              <option value="all">كل الشهور</option>
            </select>
          </label>
        ) : (
          <p className="muted">التقرير المفصّل يعرض كل الشهور لكل عضو محدد.</p>
        )}
        {!memberDetailOn && scope === 'month' ? (
          <div className="filters">
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
          </div>
        ) : null}
        {memberDetailOn && data.members.length === 0 ? (
          <p className="banner">أضف أعضاء أولاً قبل طباعة تقرير مفصّل.</p>
        ) : null}
        <button type="button" className="btn" disabled={!canPrint} onClick={printNow}>
          طباعة الملف
        </button>
      </section>

      <article className="print-sheet">
        <header className="print-head">
          <h1>{data.settings.name}</h1>
          <p>
            {memberDetailOn
              ? filterActive
                ? `تقرير مفصّل — ${reportMembers.map((m) => m.name).join('، ')}`
                : 'تقرير مفصّل — كل الأعضاء'
              : periodLabel}
          </p>
          <p>{formatDate(todayIso())}</p>
        </header>

        {balanceOn ? (
          <section>
            <h2>رصيد الصندوق</h2>
            <table>
              <tbody>
                <tr>
                  <th>الرصيد الافتتاحي</th>
                  <td>{formatMoney(data.settings.openingBalance, currency)}</td>
                </tr>
                <tr>
                  <th>مجموع الاشتراكات</th>
                  <td>{formatMoney(collected, currency)}</td>
                </tr>
                <tr>
                  <th>مجموع المصروفات</th>
                  <td>{formatMoney(spent, currency)}</td>
                </tr>
                <tr>
                  <th>المتبقي في الصندوق</th>
                  <td>{formatMoney(balance, currency)}</td>
                </tr>
              </tbody>
            </table>
          </section>
        ) : null}

        {expensesOn ? (
          <section>
            <h2>المصروفات</h2>
            <table>
              <thead>
                <tr>
                  <th>التاريخ</th>
                  <th>البيان</th>
                  <th>المبلغ</th>
                </tr>
              </thead>
              <tbody>
                {expenseRows.length === 0 ? (
                  <tr>
                    <td colSpan={3}>لا توجد مصروفات في هذا النطاق</td>
                  </tr>
                ) : (
                  expenseRows.map((item) => (
                    <tr key={item.id}>
                      <td>{formatDate(item.date)}</td>
                      <td>{item.title}</td>
                      <td>{formatMoney(item.amount, currency)}</td>
                    </tr>
                  ))
                )}
              </tbody>
              <tfoot>
                <tr>
                  <th colSpan={2}>المجموع</th>
                  <th>
                    {formatMoney(
                      expenseRows.reduce((sum, item) => sum + item.amount, 0),
                      currency,
                    )}
                  </th>
                </tr>
              </tfoot>
            </table>
          </section>
        ) : null}

        {memberDetailOn ? (
          <section>
            <h2>تقرير الأعضاء المفصّل</h2>
            {reportMembers.length === 0 ? (
              <p className="muted">لا يوجد أعضاء في التقرير. اختر عضواً واحداً على الأقل أو ألغِ التحديد لعرض الكل.</p>
            ) : (
              <>
                {reportMembers.map((member) => (
                  <MemberDetailBlock
                    key={member.id}
                    member={member}
                    rows={paymentRows.filter((row) => row.memberId === member.id)}
                    lifetime={memberPaidTotal(data, member.id)}
                    currency={currency}
                  />
                ))}
                {reportMembers.length > 1 ? (
                  <>
                    <h3>ملخص المجاميع</h3>
                    <table>
                      <thead>
                        <tr>
                          <th>العضو</th>
                          <th>مجموع ما دفع</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reportMembers.map((member) => (
                          <tr key={member.id}>
                            <td>{member.name}</td>
                            <td>{formatMoney(memberPaidTotal(data, member.id), currency)}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr>
                          <th>المجموع</th>
                          <th>
                            {formatMoney(
                              reportMembers.reduce(
                                (sum, member) => sum + memberPaidTotal(data, member.id),
                                0,
                              ),
                              currency,
                            )}
                          </th>
                        </tr>
                      </tfoot>
                    </table>
                  </>
                ) : null}
              </>
            )}
          </section>
        ) : null}

        {paymentsOn ? (
          <section>
            <h2>
              {scope === 'all' ? 'مدفوعات الأعضاء — كل الشهور' : 'مدفوعات الأعضاء — شهر واحد'}
              {filterActive ? ` (${reportMembers.length})` : ''}
            </h2>
            {reportMembers.length === 0 ? (
              <p className="muted">لا يوجد أعضاء بعد.</p>
            ) : scope === 'all' ? (
              <>
                {reportMembers.map((member) => {
                  const rows = paymentRows.filter((row) => row.memberId === member.id)
                  const receivedSum = rows.reduce((sum, row) => sum + row.received, 0)
                  return (
                    <div key={member.id} className="print-member">
                      <h3>{member.name}</h3>
                      <PaymentDetailTable rows={rows} receivedSum={receivedSum} currency={currency} />
                    </div>
                  )
                })}
                <h3>مجموع ما دفع كل شخص</h3>
                <table>
                  <thead>
                    <tr>
                      <th>العضو</th>
                      <th>مجموع ما دفع طوال الشهور</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportMembers.map((member) => (
                      <tr key={member.id}>
                        <td>{member.name}</td>
                        <td>{formatMoney(memberPaidTotal(data, member.id), currency)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>العضو</th>
                    <th>المستحق</th>
                    <th>الاشتراك</th>
                    <th>إضافي</th>
                    <th>الإجمالي</th>
                    <th>المتبقي</th>
                    <th>الحالة</th>
                    <th>تاريخ الدفع</th>
                  </tr>
                </thead>
                <tbody>
                  {paymentRows.map((row) => (
                    <tr key={row.memberId}>
                      <td>{row.member}</td>
                      <td>{formatMoney(row.due, currency)}</td>
                      <td>{formatMoney(row.paid, currency)}</td>
                      <td>{formatMoney(row.extra, currency)}</td>
                      <td>{formatMoney(row.received, currency)}</td>
                      <td>{formatMoney(row.remaining, currency)}</td>
                      <td>{statusLabel(row.status)}</td>
                      <td>{row.date ? formatDate(row.date) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <th>المجموع</th>
                    <th>{formatMoney(paymentRows.reduce((sum, row) => sum + row.due, 0), currency)}</th>
                    <th>{formatMoney(paymentRows.reduce((sum, row) => sum + row.paid, 0), currency)}</th>
                    <th>{formatMoney(paymentRows.reduce((sum, row) => sum + row.extra, 0), currency)}</th>
                    <th>
                      {formatMoney(paymentRows.reduce((sum, row) => sum + row.received, 0), currency)}
                    </th>
                    <th>
                      {formatMoney(
                        paymentRows.reduce((sum, row) => sum + row.remaining, 0),
                        currency,
                      )}
                    </th>
                    <th colSpan={2} />
                  </tr>
                </tfoot>
              </table>
            )}
          </section>
        ) : null}
      </article>
    </div>
  )
}

function MemberDetailBlock({
  member,
  rows,
  lifetime,
  currency,
}: {
  member: Member
  rows: PaymentRow[]
  lifetime: number
  currency: string
}) {
  const paidMonths = rows.filter((row) => row.paid > 0 || row.extra > 0)
  const receivedSum = rows.reduce((sum, row) => sum + row.received, 0)
  const dueSum = rows.reduce((sum, row) => sum + row.due, 0)
  const remainingSum = rows.reduce((sum, row) => sum + row.remaining, 0)
  const fullCount = rows.filter((row) => row.status === 'full').length
  const partialCount = rows.filter((row) => row.status === 'partial').length
  const noneCount = rows.filter((row) => row.status === 'none').length

  return (
    <div className="print-member">
      <h3>{member.name}</h3>
      <table>
        <tbody>
          {member.phone ? (
            <tr>
              <th>الجوال</th>
              <td>{member.phone}</td>
            </tr>
          ) : null}
          <tr>
            <th>تاريخ الانضمام</th>
            <td>
              <DualDate isoDate={member.createdAt} />
            </td>
          </tr>
          <tr>
            <th>مجموع ما دفع</th>
            <td>{formatMoney(lifetime, currency)}</td>
          </tr>
          <tr>
            <th>الشهور المكتملة</th>
            <td>
              {fullCount} مكتمل — {partialCount} جزئي — {noneCount} لم يسدد
            </td>
          </tr>
        </tbody>
      </table>
      <PaymentDetailTable rows={rows} receivedSum={receivedSum} currency={currency} />
      <table>
        <tbody>
          <tr>
            <th>إجمالي المستحق في النطاق</th>
            <td>{formatMoney(dueSum, currency)}</td>
          </tr>
          <tr>
            <th>إجمالي المدفوع في النطاق</th>
            <td>{formatMoney(receivedSum, currency)}</td>
          </tr>
          <tr>
            <th>إجمالي المتبقي في النطاق</th>
            <td>{formatMoney(remainingSum, currency)}</td>
          </tr>
          <tr>
            <th>عدد الشهور المسجّل فيها دفع</th>
            <td>{paidMonths.length}</td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}

function PaymentDetailTable({
  rows,
  receivedSum,
  currency,
}: {
  rows: PaymentRow[]
  receivedSum: number
  currency: string
}) {
  return (
    <table>
      <thead>
        <tr>
          <th>الشهر</th>
          <th>المستحق</th>
          <th>الاشتراك</th>
          <th>إضافي</th>
          <th>الإجمالي</th>
          <th>المتبقي</th>
          <th>الحالة</th>
          <th>تاريخ الدفع</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={`${row.memberId}-${row.year}-${row.month}`}>
            <td>
              {MONTHS_AR[row.month - 1]} {row.year}
            </td>
            <td>{formatMoney(row.due, currency)}</td>
            <td>{formatMoney(row.paid, currency)}</td>
            <td>{formatMoney(row.extra, currency)}</td>
            <td>{formatMoney(row.received, currency)}</td>
            <td>{formatMoney(row.remaining, currency)}</td>
            <td>{statusLabel(row.status)}</td>
            <td>{row.date ? formatDate(row.date) : '—'}</td>
          </tr>
        ))}
      </tbody>
      <tfoot>
        <tr>
          <th>المجموع</th>
          <th>{formatMoney(rows.reduce((sum, row) => sum + row.due, 0), currency)}</th>
          <th>{formatMoney(rows.reduce((sum, row) => sum + row.paid, 0), currency)}</th>
          <th>{formatMoney(rows.reduce((sum, row) => sum + row.extra, 0), currency)}</th>
          <th>{formatMoney(receivedSum, currency)}</th>
          <th>{formatMoney(rows.reduce((sum, row) => sum + row.remaining, 0), currency)}</th>
          <th colSpan={2} />
        </tr>
      </tfoot>
    </table>
  )
}

function statusLabel(status: 'none' | 'partial' | 'full'): string {
  if (status === 'full') return 'مكتمل'
  if (status === 'partial') return 'مدفوع جزئياً'
  return 'لم يسدد'
}

function yearOptions(data: AppData, current: number): number[] {
  const years = new Set([current - 1, current, current + 1])
  for (const payment of data.payments) years.add(payment.year)
  for (const member of data.members) {
    const date = parseIsoDate(member.createdAt)
    if (date) years.add(date.getFullYear())
  }
  for (const expense of data.expenses) {
    const date = parseIsoDate(expense.date)
    if (date) years.add(date.getFullYear())
  }
  return [...years].sort((a, b) => a - b)
}

function monthStamp(year: number, month: number): number {
  return year * 12 + month
}

function stampToMonth(stamp: number): { year: number; month: number } {
  const year = Math.floor((stamp - 1) / 12)
  const month = ((stamp - 1) % 12) + 1
  return { year, month }
}

function reportMonths(data: AppData): { year: number; month: number }[] {
  const now = currentYearMonth()
  const stamps = [monthStamp(now.year, now.month)]
  for (const member of data.members) {
    const date = parseIsoDate(member.createdAt)
    if (date) stamps.push(monthStamp(date.getFullYear(), date.getMonth() + 1))
  }
  for (const payment of data.payments) stamps.push(monthStamp(payment.year, payment.month))
  for (const expense of data.expenses) {
    const date = parseIsoDate(expense.date)
    if (date) stamps.push(monthStamp(date.getFullYear(), date.getMonth() + 1))
  }
  const start = Math.min(...stamps)
  const end = Math.max(...stamps)
  const months: { year: number; month: number }[] = []
  for (let stamp = start; stamp <= end; stamp += 1) {
    months.push(stampToMonth(stamp))
  }
  return months
}
