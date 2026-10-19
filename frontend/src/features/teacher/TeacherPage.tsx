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

const localDateKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`

const addDays = (date: Date, amount: number) => {
  const result = new Date(date)
  result.setDate(result.getDate() + amount)
  return result
}

const allowedDurations = ['15', '30', '45', '60', '90']
const maxBulkSlots = 250
const maxBulkRangeDays = 180

interface SlotDraft {
  startsAt: string
  endsAt: string
}

function generateSlotDrafts(
  dateFrom: string,
  dateTo: string,
  daysOfWeek: number[],
  timeFrom: string,
  timeTo: string,
  durationMinutes: number,
  breakMinutes: number,
): SlotDraft[] {
  const [fromYear, fromMonth, fromDay] = dateFrom.split('-').map(Number)
  const [toYear, toMonth, toDay] = dateTo.split('-').map(Number)
  const first = new Date(fromYear, fromMonth - 1, fromDay, 12)
  const last = new Date(toYear, toMonth - 1, toDay, 12)
  const [startHour, startMinute] = timeFrom.split(':').map(Number)
  const [endHour, endMinute] = timeTo.split(':').map(Number)
  const startOfWindow = startHour * 60 + startMinute
  const endOfWindow = endHour * 60 + endMinute
  const drafts: SlotDraft[] = []

  for (const day = new Date(first); day <= last; day.setDate(day.getDate() + 1)) {
    if (!daysOfWeek.includes(day.getDay())) continue
    for (
      let minute = startOfWindow;
      minute + durationMinutes <= endOfWindow;
      minute += durationMinutes + breakMinutes
    ) {
      const startsAt = new Date(day)
      startsAt.setHours(Math.floor(minute / 60), minute % 60, 0, 0)
      const endsAt = new Date(startsAt.getTime() + durationMinutes * 60_000)
      drafts.push({ startsAt: startsAt.toISOString(), endsAt: endsAt.toISOString() })
    }
  }

  return drafts
}

const statusLabel = (status: Reservation['status'], t: TFunction) =>
  status === 'PENDING' ? t('pending') : status === 'CONFIRMED' ? t('confirmed') : t('cancelled')

const consultationModesLabel = (slot: ConsultationSlot, t: TFunction) => {
  if (slot.onlineAvailable !== false && slot.offlineAvailable !== false) return t('bothModes')
  return slot.onlineAvailable !== false ? t('onlineConsultation') : t('offlineConsultation')
}

const cancellationCutoffMs = 3 * 60 * 60 * 1000

export default function TeacherPage({ session, onToast, view, language, t }: Props) {
  const locale = localeFor(language)
  const time = useMemo(
    () => new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit' }),
    [locale],
  )
  const dateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(locale, {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        timeZone: 'Europe/Prague',
      }),
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
  const [onlineAvailable, setOnlineAvailable] = useState(true)
  const [offlineAvailable, setOfflineAvailable] = useState(true)
  const [bulkOpen, setBulkOpen] = useState(false)
  const [bulkOnlineAvailable, setBulkOnlineAvailable] = useState(true)
  const [bulkOfflineAvailable, setBulkOfflineAvailable] = useState(true)
  const [bulkDateFrom, setBulkDateFrom] = useState(localDateKey(new Date()))
  const [bulkDateTo, setBulkDateTo] = useState(localDateKey(addDays(new Date(), 27)))
  const [bulkDays, setBulkDays] = useState<number[]>([1, 3])
  const [bulkTimeFrom, setBulkTimeFrom] = useState('09:00')
  const [bulkTimeTo, setBulkTimeTo] = useState('12:00')
  const [bulkDuration, setBulkDuration] = useState('30')
  const [bulkBreak, setBulkBreak] = useState('0')
  const [bulkSubmitting, setBulkSubmitting] = useState(false)
  const [bulkProgress, setBulkProgress] = useState(0)
  const [bulkResult, setBulkResult] = useState<{ created: number; skipped: number } | null>(null)
  const [bulkError, setBulkError] = useState('')
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
      const [hours, minutes] = startTime.split(':').map(Number)
      const startsMinutes = hours * 60 + minutes
      const endsMinutes = startsMinutes + Number(duration)
      const weekday = new Date(`${date}T12:00:00`).getDay()

      if (
        weekday === 0 ||
        weekday === 6 ||
        startsMinutes < 7 * 60 + 15 ||
        endsMinutes > 19 * 60 + 15
      ) {
        onToast({ type: 'error', message: t('workingHoursFailed') })
        return
      }
      await api.createSlot(
        session.token,
        session.userId,
        start,
        end,
        onlineAvailable,
        offlineAvailable,
      )
      onToast({ type: 'success', message: t('slotCreated') })
      await load()
    } catch (error) {
      onToast({
        type: 'error',
        message: error instanceof Error ? error.message : t('slotCreateFailed'),
      })
    }
  }

  const bulkDrafts = useMemo(() => {
    if (
      !bulkDateFrom ||
      !bulkDateTo ||
      !bulkDays.length ||
      !allowedDurations.includes(bulkDuration)
    )
      return []
    const rangeDays =
      (new Date(`${bulkDateTo}T12:00:00`).getTime() -
        new Date(`${bulkDateFrom}T12:00:00`).getTime()) /
      86_400_000
    if (rangeDays < 0 || rangeDays > maxBulkRangeDays) return []
    return generateSlotDrafts(
      bulkDateFrom,
      bulkDateTo,
      bulkDays,
      bulkTimeFrom,
      bulkTimeTo,
      Number(bulkDuration),
      Number(bulkBreak),
    )
  }, [bulkDateFrom, bulkDateTo, bulkDays, bulkTimeFrom, bulkTimeTo, bulkDuration, bulkBreak])

  function toggleBulkDay(day: number) {
    setBulkDays((selected) =>
      selected.includes(day) ? selected.filter((item) => item !== day) : [...selected, day],
    )
    setBulkResult(null)
  }

  async function addBulkSlots(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBulkError('')
    setBulkResult(null)
    if (!bulkDays.length) {
      setBulkError(t('bulkChooseDays'))
      return
    }
    if (bulkDateFrom > bulkDateTo) {
      setBulkError(t('bulkInvalidDates'))
      return
    }
    const rangeDays =
      (new Date(`${bulkDateTo}T12:00:00`).getTime() -
        new Date(`${bulkDateFrom}T12:00:00`).getTime()) /
      86_400_000
    if (rangeDays > maxBulkRangeDays) {
      setBulkError(t('bulkRangeTooLong'))
      return
    }
    const [fromHour, fromMinute] = bulkTimeFrom.split(':').map(Number)
    const [toHour, toMinute] = bulkTimeTo.split(':').map(Number)
    const startMinutes = fromHour * 60 + fromMinute
    const endMinutes = toHour * 60 + toMinute
    if (startMinutes < 7 * 60 + 15 || endMinutes > 19 * 60 + 15 || endMinutes <= startMinutes) {
      setBulkError(t('bulkInvalidHours'))
      return
    }
    const drafts = bulkDrafts
    if (!drafts.length) {
      setBulkError(t('bulkNoSlotsFit'))
      return
    }
    if (drafts.length > maxBulkSlots) {
      setBulkError(t('bulkTooManySlots'))
      return
    }

    const availableDrafts = drafts.filter((draft) => {
      const draftStart = new Date(draft.startsAt).getTime()
      const draftEnd = new Date(draft.endsAt).getTime()
      return (
        draftStart > Date.now() &&
        !slots.some(
          (slot) =>
            slot.status === 'ACTIVE' &&
            new Date(slot.startsAt).getTime() < draftEnd &&
            new Date(slot.endsAt).getTime() > draftStart,
        )
      )
    })
    let created = 0
    const alreadySkipped = drafts.length - availableDrafts.length
    let skipped = alreadySkipped
    setBulkSubmitting(true)
    setBulkProgress(alreadySkipped)
    try {
      for (const [index, draft] of availableDrafts.entries()) {
        try {
          await api.createSlot(
            session.token,
            session.userId,
            draft.startsAt,
            draft.endsAt,
            bulkOnlineAvailable,
            bulkOfflineAvailable,
          )
          created += 1
        } catch {
          skipped += 1
        }
        setBulkProgress(alreadySkipped + index + 1)
      }
      setBulkResult({ created, skipped })
      await load()
      onToast({
        type: skipped ? 'error' : 'success',
        message: skipped
          ? `${t('bulkCreatedCount')}: ${created} · ${t('bulkSkippedCount')}: ${skipped}`
          : `${t('bulkCreatedCount')}: ${created}`,
        durationMs: 7000,
      })
    } finally {
      setBulkSubmitting(false)
    }
  }

  async function cancelReservation(request: Reservation) {
    try {
      await api.cancelReservation(session.token, request.id, t('cancellationNote'))
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
                    <small>
                      {dateFormatter.format(new Date(request.startsAt))} ·{' '}
                      {time.format(new Date(request.startsAt))}–
                      {time.format(new Date(request.endsAt))}
                    </small>
                    <small>
                      {request.consultationMode === 'ONLINE'
                        ? t('onlineConsultation')
                        : `${t('offlineConsultation')}${request.teacherCabinet ? ` · ${request.teacherCabinet}` : ''}`}
                    </small>
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
                        void api.approveReservation(session.token, request.id).then(load)
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
          <div className="calendar-content">
            <div className="calendar-header">
              <button
                type="button"
                onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}
                aria-label={t('previousMonth')}
              >
                ‹
              </button>
              <strong>{monthFormatter.format(month)}</strong>
              <button
                type="button"
                onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}
                aria-label={t('nextMonth')}
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
                const otherMonth = day.getMonth() !== month.getMonth()
                const weekend = day.getDay() === 0 || day.getDay() === 6
                const hasActiveSlot = slots.some(
                  (slot) => slot.status === 'ACTIVE' && key(slot.startsAt) === dayKey,
                )

                return (
                  <button
                    key={dayKey}
                    className={`calendar-day ${hasActiveSlot && !otherMonth ? 'available' : ''} ${date === dayKey ? 'selected' : ''} ${otherMonth ? 'other-month' : ''} ${weekend && !otherMonth ? 'weekend' : ''}`}
                    disabled={otherMonth || weekend}
                    onClick={() => setDate(dayKey)}
                  >
                    {day.getDate()}
                  </button>
                )
              })}
            </div>
          </div>
        </section>

        <section className="card">
          <div className="my-slots-heading">
            <h2>{t('mySlots')}</h2>
            <button
              type="button"
              className="bulk-slot-button"
              onClick={() => {
                setBulkResult(null)
                setBulkError('')
                setBulkOpen(true)
              }}
            >
              {t('bulkAddSlots')}
            </button>
          </div>
          <p className="selected-slot-date">{dateFormatter.format(new Date(`${date}T12:00:00`))}</p>
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
                  {occupied ? ` ${t('occupied')}` : ` · ${consultationModesLabel(slot, t)}`}
                </button>
              )
            })}
            {!daySlots.length && <p className="muted">{t('noTeacherSlotsForDay')}</p>}
          </div>
          <div className="add-slot-heading">
            <h2 className="add-slot-title">{t('addSlot')}</h2>
          </div>
          <form className="teacher-slot-form" onSubmit={add}>
            <div className="slot-form-field labeled-field">
              <label htmlFor="slot-start">{t('start')}</label>
              <input
                id="slot-start"
                type="time"
                value={startTime}
                onChange={(event) => setStartTime(event.target.value)}
              />
            </div>
            <div className="slot-form-field labeled-field">
              <label htmlFor="slot-duration">{t('consultationLength')}</label>
              <select
                id="slot-duration"
                value={duration}
                onChange={(event) => setDuration(event.target.value)}
              >
                <option value="15">15 {t('minutes')}</option>
                <option value="30">30 {t('minutes')}</option>
                <option value="45">45 {t('minutes')}</option>
                <option value="60">60 {t('minutes')}</option>
                <option value="90">90 {t('minutes')}</option>
              </select>
            </div>
            <fieldset className="slot-mode-checkboxes">
              <legend>{t('consultationMode')}</legend>
              <label>
                <input
                  type="checkbox"
                  checked={onlineAvailable}
                  disabled={onlineAvailable && !offlineAvailable}
                  onChange={(event) => setOnlineAvailable(event.target.checked)}
                />
                {t('onlineConsultation')}
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={offlineAvailable}
                  disabled={offlineAvailable && !onlineAvailable}
                  onChange={(event) => setOfflineAvailable(event.target.checked)}
                />
                {t('offlineConsultation')}
              </label>
            </fieldset>
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

      {bulkOpen && (
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !bulkSubmitting) setBulkOpen(false)
          }}
        >
          <section
            className="bulk-slot-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="bulk-slot-title"
          >
            <div className="bulk-slot-modal-heading">
              <div>
                <p className="label">{t('slotsCalendar')}</p>
                <h2 id="bulk-slot-title">{t('bulkAddSlots')}</h2>
                <p>{t('bulkIntro')}</p>
              </div>
              <button
                type="button"
                className="bulk-slot-close"
                aria-label={t('back')}
                disabled={bulkSubmitting}
                onClick={() => setBulkOpen(false)}
              >
                ×
              </button>
            </div>
            <form className="bulk-slot-form" onSubmit={addBulkSlots}>
              <div className="bulk-date-fields">
                <div className="labeled-field">
                  <label htmlFor="bulk-date-from">{t('bulkDateFrom')}</label>
                  <input
                    id="bulk-date-from"
                    type="date"
                    required
                    value={bulkDateFrom}
                    onChange={(event) => setBulkDateFrom(event.target.value)}
                  />
                </div>
                <div className="labeled-field">
                  <label htmlFor="bulk-date-to">{t('bulkDateTo')}</label>
                  <input
                    id="bulk-date-to"
                    type="date"
                    min={bulkDateFrom}
                    required
                    value={bulkDateTo}
                    onChange={(event) => setBulkDateTo(event.target.value)}
                  />
                </div>
              </div>

              <fieldset className="bulk-weekday-picker">
                <legend>{t('bulkWeekdays')}</legend>
                <div>
                  {weekdays[language].slice(0, 5).map((weekday, index) => {
                    const day = index + 1
                    return (
                      <label key={day} className={bulkDays.includes(day) ? 'selected' : ''}>
                        <input
                          type="checkbox"
                          checked={bulkDays.includes(day)}
                          onChange={() => toggleBulkDay(day)}
                        />
                        {weekday}
                      </label>
                    )
                  })}
                </div>
              </fieldset>

              <p className="bulk-repeat-hint">{t('bulkRepeatsWeekly')}</p>

              <div className="bulk-mode-row" role="group" aria-label={t('consultationMode')}>
                <span className="bulk-mode-label">{t('consultationMode')}:</span>
                <label>
                  <input
                    type="checkbox"
                    checked={bulkOnlineAvailable}
                    disabled={bulkOnlineAvailable && !bulkOfflineAvailable}
                    onChange={(event) => setBulkOnlineAvailable(event.target.checked)}
                  />
                  {t('onlineConsultation')}
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={bulkOfflineAvailable}
                    disabled={bulkOfflineAvailable && !bulkOnlineAvailable}
                    onChange={(event) => setBulkOfflineAvailable(event.target.checked)}
                  />
                  {t('offlineConsultation')}
                </label>
              </div>

              <div className="bulk-date-fields">
                <div className="labeled-field">
                  <label htmlFor="bulk-time-from">{t('bulkTimeFrom')}</label>
                  <input
                    id="bulk-time-from"
                    type="time"
                    required
                    value={bulkTimeFrom}
                    onChange={(event) => setBulkTimeFrom(event.target.value)}
                  />
                </div>
                <div className="labeled-field">
                  <label htmlFor="bulk-time-to">{t('bulkTimeTo')}</label>
                  <input
                    id="bulk-time-to"
                    type="time"
                    required
                    value={bulkTimeTo}
                    onChange={(event) => setBulkTimeTo(event.target.value)}
                  />
                </div>
              </div>

              <div className="bulk-date-fields">
                <div className="labeled-field">
                  <label htmlFor="bulk-duration">{t('consultationLength')}</label>
                  <select
                    id="bulk-duration"
                    value={bulkDuration}
                    onChange={(event) => setBulkDuration(event.target.value)}
                  >
                    {allowedDurations.map((minutes) => (
                      <option key={minutes} value={minutes}>
                        {minutes} {t('minutes')}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="labeled-field">
                  <label htmlFor="bulk-break">{t('bulkBreak')}</label>
                  <select
                    id="bulk-break"
                    value={bulkBreak}
                    onChange={(event) => setBulkBreak(event.target.value)}
                  >
                    {['0', '5', '10', '15'].map((minutes) => (
                      <option key={minutes} value={minutes}>
                        {minutes} {t('minutes')}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="bulk-slot-preview">
                <strong>{bulkDrafts.length}</strong>
                <span>{t('bulkPreviewCount')}</span>
              </div>
              {bulkError && (
                <p className="bulk-slot-error" role="alert">
                  {bulkError}
                </p>
              )}
              {bulkResult && (
                <p className="bulk-slot-result" role="status">
                  {t('bulkCreatedCount')}: {bulkResult.created} · {t('bulkSkippedCount')}:{' '}
                  {bulkResult.skipped}
                </p>
              )}
              {bulkSubmitting && (
                <div className="bulk-progress">
                  <progress value={bulkProgress} max={bulkDrafts.length} />
                  <span>
                    {bulkProgress} / {bulkDrafts.length}
                  </span>
                </div>
              )}

              <div className="modal-actions">
                <button
                  type="button"
                  className="text-button"
                  disabled={bulkSubmitting}
                  onClick={() => setBulkOpen(false)}
                >
                  {t('back')}
                </button>
                <button className="reserve-button" type="submit" disabled={bulkSubmitting}>
                  {bulkSubmitting ? t('bulkCreating') : t('bulkCreateAction')}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </main>
  )
}
