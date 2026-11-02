import type { ChangeEvent } from 'react'
import type { TFunction } from '../i18n'

interface Props {
  id: string
  note: string
  onChange: (event: ChangeEvent<HTMLTextAreaElement>) => void
  t: TFunction
}

export default function CancellationReasonField({ id, note, onChange, t }: Props) {
  return (
    <div className="cancellation-reason-field">
      <label htmlFor={id}>{t('cancellationReason')}</label>
      <textarea
        id={id}
        value={note}
        maxLength={1000}
        placeholder={t('cancellationReasonPlaceholder')}
        onChange={onChange}
      />
      <p className="cancellation-note-hint">{t('cancellationReasonOptional')}</p>
    </div>
  )
}
