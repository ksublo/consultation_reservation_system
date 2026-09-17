import { useEffect, useMemo, useState } from 'react'
import { api } from '../../api/client'
import type { Language, TFunction } from '../../i18n'
import { localeFor } from '../../i18n'
import type { Reservation, Session, Toast } from '../../types/api'

interface Props { session: Session; onToast: (toast: Toast) => void; refreshSignal: number; language: Language; t: TFunction }

const timeZone = 'Europe/Prague'

function statusLabel(status: Reservation['status'], t: TFunction) {
  if (status === 'PENDING') return t('pending')
  if (status === 'CONFIRMED') return t('confirmed')
  return t('cancelled')
}

function ReservationList({ reservations, empty, language, t, now }: { reservations: Reservation[]; empty: string; language: Language; t: TFunction; now: number }) {
  const locale = localeFor(language)
  const dateTimeFormatter = new Intl.DateTimeFormat(locale, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone })
  const timeFormatter = new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit', timeZone })
  if (!reservations.length) return <p className="muted">{empty}</p>
  return <div className="student-reservations">{reservations.map((reservation) => { const startsAt = new Date(reservation.startsAt).getTime(); const startsSoon = reservation.status !== 'CANCELLED' && startsAt >= now && startsAt - now <= 3 * 60 * 60 * 1000; return <article className="student-reservation" key={reservation.id}><div><strong>{reservation.teacherName}</strong><span>{dateTimeFormatter.format(new Date(reservation.startsAt))}–{timeFormatter.format(new Date(reservation.endsAt))}</span>{startsSoon && <em className="soon-warning">{t('startsSoonWarning')}</em>}</div><div><b>{reservation.reasonTitle}</b><p>{reservation.reasonDescription}</p></div><span className={`status ${reservation.status.toLowerCase()}`}>{statusLabel(reservation.status, t)}</span></article> })}</div>
}

export default function MyReservationsPage({ session, onToast, refreshSignal, language, t }: Props) {
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [showHistory, setShowHistory] = useState(true)
  const [loading, setLoading] = useState(true)
  const [now, setNow] = useState(() => Date.now())

  async function load() {
    try { setLoading(true); const data = await api.getReservations(session.token, session.userId); setReservations(data.filter((item) => item.studentId === session.userId)); setNow(Date.now()) }
    catch (error) { onToast({ type: 'error', message: error instanceof Error ? error.message : t('loadMyReservationsFailed') }) }
    finally { setLoading(false) }
  }

  useEffect(() => { void load() }, [refreshSignal])

  const [activeReservations, historicalReservations] = useMemo(() => {
    return reservations.reduce<[Reservation[], Reservation[]]>((groups, reservation) => {
      const active = reservation.status !== 'CANCELLED' && new Date(reservation.endsAt).getTime() >= now
      groups[active ? 0 : 1].push(reservation)
      return groups
    }, [[], []])
  }, [now, reservations])

  return <main><section className="card"><div className="section-title"><div><h2>{t('myReservations')}</h2><p>{loading ? t('loading') : `${activeReservations.length} ${t('currentCount')}`}</p></div></div><ReservationList reservations={activeReservations} empty={t('noActiveReservations')} language={language} t={t} now={now} /></section><section className="card reservation-history"><div className="section-title"><div><h2>{t('history')}</h2><p>{historicalReservations.length} {t('records')}</p></div><label className="history-toggle"><input type="checkbox" checked={showHistory} onChange={(event) => setShowHistory(event.target.checked)} />{t('showHistory')}</label></div>{showHistory && <ReservationList reservations={historicalReservations} empty={t('emptyHistory')} language={language} t={t} now={now} />}</section></main>
}
