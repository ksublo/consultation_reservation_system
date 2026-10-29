import type { TFunction } from '../i18n'
import type { HistoryPeriod } from './history-period'

interface Props {
  value: HistoryPeriod
  onChange: (value: HistoryPeriod) => void
  t: TFunction
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
