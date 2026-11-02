import type { TFunction } from '../i18n'

export type HistoryPeriod = 'lastWeek' | 'lastMonth' | 'winterSemester' | 'summerSemester' | 'all'

interface Props {
  value: HistoryPeriod
  onChange: (value: HistoryPeriod) => void
  t: TFunction
}

const pragueDateKey = (value: Date) => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Prague',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(value)
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((item) => item.type === type)?.value ?? ''
  return `${part('year')}-${part('month')}-${part('day')}`
}

function shiftedByCalendarPeriod(value: Date, years: number, months: number) {
  const originalDay = value.getDate()
  const result = new Date(value)
  result.setDate(1)
  result.setFullYear(result.getFullYear() + years)
  result.setMonth(result.getMonth() + months)
  const lastDay = new Date(result.getFullYear(), result.getMonth() + 1, 0).getDate()
  result.setDate(Math.min(originalDay, lastDay))
  return result
}

export function filterHistoryByPeriod<T extends { startsAt: string }>(
  records: T[],
  period: HistoryPeriod,
  now = Date.now(),
) {
  if (period === 'all') return records

  const today = new Date(now)
  if (period === 'lastWeek' || period === 'lastMonth') {
    const months = period === 'lastMonth' ? -1 : 0
    const start =
      period === 'lastWeek'
        ? new Date(now - 7 * 24 * 60 * 60 * 1000)
        : shiftedByCalendarPeriod(today, 0, months)
    return records.filter((record) => {
      const startsAt = new Date(record.startsAt).getTime()
      return startsAt >= start.getTime() && startsAt <= now
    })
  }

  const todayParts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Prague',
    year: 'numeric',
    month: '2-digit',
  }).formatToParts(today)
  const year = Number(todayParts.find((part) => part.type === 'year')?.value)
  const month = Number(todayParts.find((part) => part.type === 'month')?.value)
  let from: string
  let through: string

  if (period === 'winterSemester') {
    const semesterStart = month >= 9 ? year : year - 1
    from = `${semesterStart}-09-01`
    through = `${semesterStart + 1}-01-31`
  } else {
    const semesterStart = month >= 2 ? year : year - 1
    from = `${semesterStart}-02-01`
    through = `${semesterStart}-06-30`
  }

  return records.filter((record) => {
    const date = pragueDateKey(new Date(record.startsAt))
    return date >= from && date <= through
  })
}

export default function HistoryPeriodFilter({ value, onChange, t }: Props) {
  const periods: { value: HistoryPeriod; label: Parameters<TFunction>[0] }[] = [
    { value: 'lastWeek', label: 'historyLastWeek' },
    { value: 'lastMonth', label: 'historyLastMonth' },
    { value: 'summerSemester', label: 'historySummerSemester' },
    { value: 'winterSemester', label: 'historyWinterSemester' },
    { value: 'all', label: 'historyAll' },
  ]

  return (
    <div className="history-period-filter" role="group" aria-label={t('historyPeriod')}>
      {periods.map((period) => (
        <button
          key={period.value}
          className="history-period-button"
          type="button"
          aria-pressed={value === period.value}
          onClick={() => onChange(period.value)}
        >
          {t(period.label)}
        </button>
      ))}
    </div>
  )
}
