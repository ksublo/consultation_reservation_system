import { useEffect } from 'react'
import type { Language, TFunction } from '../i18n'
import { localeFor } from '../i18n'
import type { Reservation } from '../types/api'

interface Props {
  language: Language
  onClose: () => void
  reservation: Reservation | null
  t: TFunction
}

export default function CancellationDetailsDialog({ language, onClose, reservation, t }: Props) {
  useEffect(() => {
    if (!reservation) return
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [onClose, reservation])

  if (!reservation) return null

  const cancelledAt = reservation.cancelledAt
    ? new Intl.DateTimeFormat(localeFor(language), {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Europe/Prague',
      }).format(new Date(reservation.cancelledAt))
    : t('cancellationTimeUnavailable')
  const note = reservation.cancellationNote?.trim()

  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <section
        className="confirmation-modal cancellation-details-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cancellation-details-title"
      >
        <div className="modal-heading">
          <div className="modal-icon modal-icon-info" aria-hidden="true">
            i
          </div>
          <div>
            <h2 id="cancellation-details-title">{t('cancellationDetails')}</h2>
          </div>
          <button type="button" className="modal-close" aria-label={t('back')} onClick={onClose}>
            ×
          </button>
        </div>
        <dl className="cancellation-details">
          <div>
            <dt>{t('cancelledBy')}</dt>
            <dd>{reservation.cancelledByName ?? t('cancellationActorUnavailable')}</dd>
          </div>
          <div>
            <dt>{t('cancelledAt')}</dt>
            <dd>{cancelledAt}</dd>
          </div>
          <div>
            <dt>{t('cancellationReason')}</dt>
            <dd>{note || t('cancellationReasonNotProvided')}</dd>
          </div>
        </dl>
      </section>
    </div>
  )
}
