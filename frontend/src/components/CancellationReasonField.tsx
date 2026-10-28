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
    <>
      <label className="labeled-field" htmlFor={id}>
        {t('cancellationReason')}
        <textarea
          id={id}
          value={note}
          maxLength={1000}
          placeholder={t('cancellationReasonPlaceholder')}
          onChange={onChange}
        />
      </label>
      <p className="cancellation-note-hint">{t('cancellationReasonOptional')}</p>
    </>
  )
}
