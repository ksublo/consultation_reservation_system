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
    <div className="modal-backdrop" role="presentation">
      <section
        className="confirmation-modal cancellation-details-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cancellation-details-title"
      >
        <h2 id="cancellation-details-title">{t('cancellationDetails')}</h2>
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
        <div className="modal-actions">
          <button type="button" className="text-button" onClick={onClose}>
            {t('back')}
          </button>
        </div>
      </section>
    </div>
  )
}
