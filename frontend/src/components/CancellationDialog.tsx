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

  useEffect(() => {
    if (!reservation) return
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isSubmitting) onClose()
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [isSubmitting, onClose, reservation])

  if (!reservation) return null

  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !isSubmitting) onClose()
      }}
    >
      <section
        className="confirmation-modal cancellation-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cancel-reservation-title"
      >
        <div className="modal-heading">
          <div className="modal-icon modal-icon-danger" aria-hidden="true">
            !
          </div>
          <div>
            <h2 id="cancel-reservation-title">{t('cancelReservationTitle')}</h2>
          </div>
          <button
            type="button"
            className="modal-close"
            aria-label={t('back')}
            disabled={isSubmitting}
            onClick={onClose}
          >
            ×
          </button>
        </div>
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
