import { useEffect, useState } from 'react'
import type { TFunction } from '../i18n'
import type { Reservation } from '../types/api'
import CancellationReasonField from './CancellationReasonField'

interface Props {
  reservation: Reservation | null
  isSubmitting: boolean
  onClose: () => void
  onConfirm: (note: string) => void
  t: TFunction
}

export default function CancellationDialog({
  reservation,
  isSubmitting,
  onClose,
  onConfirm,
  t,
}: Props) {
  const [note, setNote] = useState('')

  useEffect(() => {
    setNote('')
  }, [reservation])

  if (!reservation) return null

  return (
    <div className="modal-backdrop" role="presentation">
      <section
        className="confirmation-modal cancellation-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cancel-reservation-title"
      >
        <h2 id="cancel-reservation-title">{t('cancelReservationTitle')}</h2>
        <p>{t('cancelReservationMessage')}</p>
        <CancellationReasonField
          id="cancellation-note"
          note={note}
          onChange={(event) => setNote(event.target.value)}
          t={t}
        />
        <div className="modal-actions">
          <button type="button" className="text-button" disabled={isSubmitting} onClick={onClose}>
            {t('back')}
          </button>
          <button
            type="button"
            className="danger-button"
            disabled={isSubmitting}
            onClick={() => onConfirm(note.trim())}
          >
            {isSubmitting ? t('cancelling') : t('cancel')}
          </button>
        </div>
      </section>
    </div>
  )
}
