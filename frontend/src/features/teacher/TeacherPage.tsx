import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { api } from '../../api/client'
import type { Language, TFunction } from '../../i18n'
import { localeFor } from '../../i18n'
import type { ConsultationSlot, Reservation, Session, Toast } from '../../types/api'

type View = 'slots' | 'requests'

interface Props {
  session: Session
  onToast: (toast: Toast) => void
  view: View
  language: Language
  t: TFunction
}

const weekdays = {
  cs: ['Po', 'Út', 'St', 'Čt', 'Pá', 'So', 'Ne'],
  en: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
}

const key = (value: string) =>
  new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Prague' }).format(new Date(value))

const buildDays = (month: Date) => {
  const start = new Date(month.getFullYear(), month.getMonth(), 1)
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7))

  return Array.from({ length: 42 }, (_, index) => {
    const day = new Date(start)
    day.setDate(start.getDate() + index)
    return day
  })
}

const statusLabel = (status: Reservation['status'], t: TFunction) =>
  status === 'PENDING' ? t('pending') : status === 'CONFIRMED' ? t('confirmed') : t('cancelled')

const cancellationCutoffMs = 3 * 60 * 60 * 1000

export default function TeacherPage({ session, onToast, view, language, t }: Props) {
  const locale = localeFor(language)
  const time = useMemo(
    () => new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit' }),
    [locale],
  )
  const monthFormatter = useMemo(
    () => new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }),
    [locale],
  )
  const [slots, setSlots] = useState<ConsultationSlot[]>([])
  const [requests, setRequests] = useState<Reservation[]>([])
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [month, setMonth] = useState(new Date())
  const [startTime, setStartTime] = useState('09:00')
  const [duration, setDuration] = useState('30')
  const [now, setNow] = useState(() => Date.now())
  const [slotToCancel, setSlotToCancel] = useState<ConsultationSlot | null>(null)

  async function load() {
    try {
      const [slotData, reservationData] = await Promise.all([
        api.getTeacherSlots(session.token, session.userId),
        api.getReservations(session.token, session.userId),
      ])
      setSlots(slotData)
      setRequests(reservationData.filter((item) => item.teacherId === session.userId))
      setNow(Date.now())
    } catch (error) {
      onToast({
        type: 'error',
        message: error instanceof Error ? error.message : t('loadDataFailed'),
      })
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const daySlots = useMemo(
    () => slots.filter((slot) => slot.status === 'ACTIVE' && key(slot.startsAt) === date),
    [slots, date],
  )

  const reservationToCancel = slotToCancel
    ? requests.find(
        (request) =>
          request.slotId === slotToCancel.id &&
          (request.status === 'PENDING' || request.status === 'CONFIRMED'),
      )
    : undefined

  async function add(event: FormEvent) {
    event.preventDefault()
    try {
      const start = new Date(`${date}T${startTime}`).toISOString()
      if (new Date(start).getTime() <= Date.now()) {
        onToast({ type: 'error', message: t('pastSlotCreateFailed') })
        return
      }
      const end = new Date(new Date(start).getTime() + Number(duration) * 60000).toISOString()
      const startsAt = new Date(start)
      const endsAt = new Date(end)
      const weekday = startsAt.getDay()
      const startsMinutes = startsAt.getHours() * 60 + startsAt.getMinutes()
      const endsMinutes = endsAt.getHours() * 60 + endsAt.getMinutes()

      if (
        weekday === 0 ||
        weekday === 6 ||
        startsMinutes < 7 * 60 + 15 ||
        endsMinutes > 19 * 60 + 15
      ) {
        onToast({ type: 'error', message: t('workingHoursFailed') })
        return
      }
      await api.createSlot(session.token, session.userId, start, end)
      onToast({ type: 'success', message: t('slotCreated') })
      await load()
    } catch (error) {
      onToast({
        type: 'error',
        message: error instanceof Error ? error.message : t('slotCreateFailed'),
      })
    }
  }

  async function cancelReservation(request: Reservation) {
    try {
      await api.cancelReservation(session.token, request.id, session.userId, t('cancellationNote'))
      onToast({ type: 'success', message: t('reservationCancelled') })
      await load()
    } catch (error) {
      onToast({
        type: 'error',
        message: error instanceof Error ? error.message : t('reservationCancelFailed'),
      })
    }
  }

  async function cancelOpenSlot(slot: ConsultationSlot) {
    try {
      await api.cancelSlot(session.token, slot.id, session.userId)
      onToast({ type: 'success', message: t('slotCancelled') })
      await load()
    } catch (error) {
      onToast({
        type: 'error',
        message: error instanceof Error ? error.message : t('slotCancelFailed'),
      })
    }
  }

  async function confirmCancelOccupiedSlot() {
    if (!slotToCancel) return

    try {
      await api.cancelSlotWithReservation(
        session.token,
        slotToCancel.id,
        session.userId,
        t('teacherCancellationNote'),
      )
      setSlotToCancel(null)
      onToast({ type: 'success', message: t('slotCancelled') })
      await load()
    } catch (error) {
      onToast({
        type: 'error',
        message: error instanceof Error ? error.message : t('slotCancelFailed'),
      })
    }
  }

  if (view === 'requests') {
    return (
      <main>
        <section className="card">
          <h2>{t('teacherRequests')}</h2>
          <div className="request-table">
            <div className="request-head">
              <span>{t('studentColumn')}</span>
              <span>{t('contact')}</span>
              <span>{t('topic')}</span>
              <span>{t('status')}</span>
              <span>{t('actions')}</span>
            </div>
            {requests.map((request) => {
              const canCancel =
                request.status !== 'CANCELLED' &&
                new Date(request.startsAt).getTime() - now >= cancellationCutoffMs
              return (
                <div className="request-row" key={request.id}>
                  <div>
                    <b>
                      {request.studentFirstName} {request.studentLastName}
                    </b>
                    <small>{request.studentLogin}</small>
                  </div>
                  <small>{request.studentEmail}</small>
                  <div>
                    <b>{request.reasonTitle}</b>
                    <p>{request.reasonDescription}</p>
                  </div>
                  <span className={`status ${request.status.toLowerCase()}`}>
                    {statusLabel(request.status, t)}
                  </span>
                  <div className="request-actions">
                    <button
                      className="approve-icon"
                      title={t('approve')}
                      disabled={request.status !== 'PENDING'}
                      onClick={() =>
                        void api
                          .approveReservation(session.token, request.id, session.userId)
                          .then(load)
                      }
                    >
                      ✓
                    </button>
                    <button
                      className="cancel-icon"
                      title={canCancel ? t('cancel') : t('cancelTooLate')}
                      disabled={!canCancel}
                      onClick={() => void cancelReservation(request)}
                    >
                      ×
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      </main>
    )
  }

  return (
    <main>
      <div className="teacher-grid">
        <section className="card">
          <h2>{t('slotsCalendar')}</h2>
          <div className="calendar-header">
            <button
              type="button"
              onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}
            >
              ‹
            </button>
            <strong>{monthFormatter.format(month)}</strong>
            <button
              type="button"
              onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}
            >
              ›
            </button>
          </div>
          <div className="weekday-row">
            {weekdays[language].map((day) => (
              <span key={day}>{day}</span>
            ))}
          </div>
          <div className="calendar-grid">
            {buildDays(month).map((day) => {
              const dayKey = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(
                2,
                '0',
              )}-${String(day.getDate()).padStart(2, '0')}`
              const hasActiveSlot = slots.some(
                (slot) => slot.status === 'ACTIVE' && key(slot.startsAt) === dayKey,
              )

              return (
                <button
                  key={dayKey}
                  className={`calendar-day ${hasActiveSlot ? 'available' : ''} ${
                    date === dayKey ? 'selected' : ''
                  }`}
                  onClick={() => setDate(dayKey)}
                >
                  {day.getDate()}
                </button>
              )
            })}
          </div>
        </section>

        <section className="card">
          <h2>{t('mySlots')}</h2>
          <div className="slot-list teacher-slots">
            {daySlots.map((slot) => {
              const occupied = requests.some(
                (request) =>
                  request.slotId === slot.id &&
                  (request.status === 'PENDING' || request.status === 'CONFIRMED'),
              )
              return (
                <button
                  className={occupied ? 'slot occupied' : 'slot'}
                  key={slot.id}
                  onClick={() => (occupied ? setSlotToCancel(slot) : void cancelOpenSlot(slot))}
                >
                  <span>
                    {time.format(new Date(slot.startsAt))}–{time.format(new Date(slot.endsAt))}
                  </span>
                  {!occupied && <span className="remove-slot">×</span>}
                  {occupied && ` ${t('occupied')}`}
                </button>
              )
            })}
            {!daySlots.length && <p className="muted">{t('noTeacherSlotsForDay')}</p>}
          </div>
          <h2 className="add-slot-title">{t('addSlot')}</h2>
          <form onSubmit={add}>
            <label>{t('start')}</label>
            <input
              type="time"
              value={startTime}
              onChange={(event) => setStartTime(event.target.value)}
            />
            <label>{t('consultationLength')}</label>
            <select value={duration} onChange={(event) => setDuration(event.target.value)}>
              <option value="15">15 {t('minutes')}</option>
              <option value="30">30 {t('minutes')}</option>
              <option value="45">45 {t('minutes')}</option>
              <option value="60">60 {t('minutes')}</option>
              <option value="90">90 {t('minutes')}</option>
            </select>
            <button className="reserve-button">{t('addSlot')}</button>
          </form>
        </section>
      </div>

      {slotToCancel && (
        <div className="modal-backdrop" role="presentation">
          <section
            className="confirmation-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="cancel-occupied-slot-title"
          >
            <h2 id="cancel-occupied-slot-title">{t('cancelOccupiedSlotTitle')}</h2>
            <p>{t('cancelOccupiedSlotMessage')}</p>
            {reservationToCancel && (
              <div className="modal-student">
                <strong>
                  {reservationToCancel.studentFirstName} {reservationToCancel.studentLastName}
                </strong>
                <span>{reservationToCancel.studentLogin}</span>
                <span>{reservationToCancel.studentEmail}</span>
              </div>
            )}
            <div className="modal-actions">
              <button type="button" className="text-button" onClick={() => setSlotToCancel(null)}>
                {t('back')}
              </button>
              <button
                type="button"
                className="danger-button"
                onClick={() => void confirmCancelOccupiedSlot()}
              >
                {t('cancelOccupiedSlotConfirm')}
              </button>
            </div>
          </section>
        </div>
      )}
    </main>
  )
}
