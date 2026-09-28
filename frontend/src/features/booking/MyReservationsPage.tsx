import { useEffect, useMemo, useState } from 'react'
import { api } from '../../api/client'
import type { Language, TFunction } from '../../i18n'
import { localeFor } from '../../i18n'
import type { Reservation, Session, Toast } from '../../types/api'

interface Props {
  session: Session
  onToast: (toast: Toast) => void
  refreshSignal: number
  language: Language
  t: TFunction
}

const timeZone = 'Europe/Prague'
const cancellationCutoffMs = 3 * 60 * 60 * 1000

function statusLabel(status: Reservation['status'], t: TFunction) {
  if (status === 'PENDING') return t('pending')
  if (status === 'CONFIRMED') return t('confirmed')
  return t('cancelled')
}

function ReservationList({
  reservations,
  empty,
  language,
  onCancel,
  t,
  now,
}: {
  reservations: Reservation[]
  empty: string
  language: Language
  onCancel?: (reservation: Reservation) => void
  t: TFunction
  now: number
}) {
  const locale = localeFor(language)
  const dateTimeFormatter = new Intl.DateTimeFormat(locale, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone,
  })
  const timeFormatter = new Intl.DateTimeFormat(locale, {
    hour: '2-digit',
    minute: '2-digit',
    timeZone,
  })
  if (!reservations.length) return <p className="muted">{empty}</p>
  return (
    <div className="student-reservations">
      {reservations.map((reservation) => {
        const startsAt = new Date(reservation.startsAt).getTime()
        const startsSoon =
          reservation.status !== 'CANCELLED' &&
          startsAt >= now &&
          startsAt - now <= cancellationCutoffMs
        const showCancel =
          Boolean(onCancel) && reservation.status !== 'CANCELLED' && startsAt >= now
        const canCancel = startsAt - now >= cancellationCutoffMs
        return (
          <article className="student-reservation" key={reservation.id}>
            <div>
              <strong>{reservation.teacherName}</strong>
              <span>
                {dateTimeFormatter.format(new Date(reservation.startsAt))}–
                {timeFormatter.format(new Date(reservation.endsAt))}
              </span>
              {startsSoon && <em className="soon-warning">{t('startsSoonWarning')}</em>}
            </div>
            <div>
              <b>{reservation.reasonTitle}</b>
              <p>{reservation.reasonDescription}</p>
            </div>
            <div className="reservation-status-actions">
              <span className={`status ${reservation.status.toLowerCase()}`}>
                {statusLabel(reservation.status, t)}
              </span>
              {showCancel && (
                <button
                  className="cancel-icon"
                  type="button"
                  title={canCancel ? t('cancel') : t('cancelTooLate')}
                  aria-label={canCancel ? t('cancel') : t('cancelTooLate')}
                  disabled={!canCancel}
                  onClick={() => onCancel?.(reservation)}
                >
                  ×
                </button>
              )}
            </div>
          </article>
        )
      })}
    </div>
  )
}

export default function MyReservationsPage({
  session,
  onToast,
  refreshSignal,
  language,
  t,
}: Props) {
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [showActiveReservations, setShowActiveReservations] = useState(true)
  const [showHistory, setShowHistory] = useState(false)
  const [loading, setLoading] = useState(true)
  const [now, setNow] = useState(() => Date.now())

  async function load() {
    try {
      setLoading(true)
      const data = await api.getReservations(session.token, session.userId)
      setReservations(data.filter((item) => item.studentId === session.userId))
      setNow(Date.now())
    } catch (error) {
      onToast({
        type: 'error',
        message: error instanceof Error ? error.message : t('loadMyReservationsFailed'),
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [refreshSignal])

  async function cancelReservation(reservation: Reservation) {
    try {
      await api.cancelReservation(
        session.token,
        reservation.id,
        session.userId,
        t('cancellationNote'),
      )
      onToast({ type: 'success', message: t('reservationCancelled') })
      await load()
    } catch (error) {
      onToast({
        type: 'error',
        message: error instanceof Error ? error.message : t('reservationCancelFailed'),
      })
    }
  }

  const [activeReservations, historicalReservations] = useMemo(() => {
    return reservations.reduce<[Reservation[], Reservation[]]>(
      (groups, reservation) => {
        const active =
          reservation.status !== 'CANCELLED' && new Date(reservation.endsAt).getTime() >= now
        groups[active ? 0 : 1].push(reservation)
        return groups
      },
      [[], []],
    )
  }, [now, reservations])

  return (
    <main>
      <section className="card">
        <div className="section-title">
          <div>
            <h2>{t('myReservations')}</h2>
            <p>{loading ? t('loading') : `${activeReservations.length} ${t('currentCount')}`}</p>
          </div>
          <button
            className="history-toggle"
            type="button"
            aria-label={showActiveReservations ? t('hideHistory') : t('showHistory')}
            aria-expanded={showActiveReservations}
            onClick={() => setShowActiveReservations((current) => !current)}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d={showActiveReservations ? 'm6 15 6-6 6 6' : 'm6 9 6 6 6-6'} />
            </svg>
          </button>
        </div>
        {showActiveReservations && (
          <ReservationList
            reservations={activeReservations}
            empty={t('noActiveReservations')}
            language={language}
            onCancel={(reservation) => void cancelReservation(reservation)}
            t={t}
            now={now}
          />
        )}
      </section>
      <section className="card reservation-history">
        <div className="section-title">
          <div>
            <h2>{t('history')}</h2>
            <p>
              {historicalReservations.length} {t('records')}
            </p>
          </div>
          <button
            className="history-toggle"
            type="button"
            aria-label={showHistory ? t('hideHistory') : t('showHistory')}
            aria-expanded={showHistory}
            onClick={() => setShowHistory((current) => !current)}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d={showHistory ? 'm6 15 6-6 6 6' : 'm6 9 6 6 6-6'} />
            </svg>
          </button>
        </div>
        {showHistory && (
          <ReservationList
            reservations={historicalReservations}
            empty={t('emptyHistory')}
            language={language}
            t={t}
            now={now}
          />
        )}
      </section>
    </main>
  )
}
