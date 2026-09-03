import { dualDate } from './format'
import { useStore } from './store'

type Props = {
  isoDate: string
  className?: string
}

export function DualDate({ isoDate, className = '' }: Props) {
  const { calendar } = useStore()
  const { hijri, gregorian } = dualDate(isoDate)
  const primary = calendar === 'hijri' ? hijri : gregorian
  const secondary = calendar === 'hijri' ? gregorian : hijri

  return (
    <span className={`dual-date ${className}`.trim()}>
      <span className="primary">{primary}</span>
      {secondary ? <span className="secondary">{secondary}</span> : null}
    </span>
  )
}
