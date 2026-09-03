import { DualDate } from './DualDate'
import {
  daysInCalendarMonth,
  isoToParts,
  monthNames,
  partsToIso,
  yearChoices,
} from './format'
import { useStore } from './store'

type Props = {
  label: string
  value: string
  onChange: (isoDate: string) => void
  required?: boolean
}

export function DateField({ label, value, onChange }: Props) {
  const { calendar } = useStore()
  const parts = isoToParts(value, calendar)
  const maxDay = daysInCalendarMonth(parts.year, parts.month, calendar)
  const months = monthNames(calendar)
  const years = yearChoices(parts.year)
  const calendarLabel = calendar === 'hijri' ? 'بالهجري' : 'بالميلادي'

  function emit(next: Partial<typeof parts>) {
    onChange(partsToIso({ ...parts, ...next }, calendar))
  }

  return (
    <div className="date-field">
      <p className="date-legend">
        {label} <span className="date-mode">{calendarLabel}</span>
      </p>
      <div className="date-picks">
        <label>
          اليوم
          <select
            value={Math.min(parts.day, maxDay)}
            onChange={(event) => emit({ day: Number(event.target.value) })}
          >
            {days(maxDay).map((day) => (
              <option key={day} value={day}>
                {day}
              </option>
            ))}
          </select>
        </label>
        <label>
          الشهر
          <select
            value={parts.month}
            onChange={(event) => emit({ month: Number(event.target.value) })}
          >
            {months.map((name, index) => (
              <option key={name} value={index + 1}>
                {name}
              </option>
            ))}
          </select>
        </label>
        <label>
          السنة
          <select
            value={parts.year}
            onChange={(event) => emit({ year: Number(event.target.value) })}
          >
            {years.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </label>
      </div>
      <DualDate isoDate={value} />
    </div>
  )
}

function days(max: number): number[] {
  const list: number[] = []
  for (let day = 1; day <= max; day += 1) list.push(day)
  return list
}
