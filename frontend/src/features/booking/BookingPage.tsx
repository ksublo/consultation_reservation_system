import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { api } from '../../api/client'
import type { Language, TFunction } from '../../i18n'
import { localeFor } from '../../i18n'
import type { ConsultationSlot, Reservation, Session, Teacher, Toast } from '../../types/api'

const timeZone = 'Europe/Prague'
const weekdays = {
  cs: ['Po', 'Út', 'St', 'Čt', 'Pá', 'So', 'Ne'],
  en: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
}
const slotDateKey = (value: string) =>
  new Intl.DateTimeFormat('sv-SE', { timeZone }).format(new Date(value))
const dateKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
const monthFor = (key: string) => {
  const [year, month] = key.split('-').map(Number)
  return new Date(year, month - 1, 1)
}
function calendarDays(month: Date): Date[] {
  const start = new Date(month.getFullYear(), month.getMonth(), 1)
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7))
  return Array.from({ length: 42 }, (_, index) => {
    const day = new Date(start)
    day.setDate(start.getDate() + index)
    return day
  })
}
const normalizeSearchText = (value: string) =>
  value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLocaleLowerCase('cs-CZ')
    .trim()

function academicYearStartYear(value: Date) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: 'numeric',
  }).formatToParts(value)
  const year = Number(parts.find((part) => part.type === 'year')?.value)
  const month = Number(parts.find((part) => part.type === 'month')?.value)
  return month >= 9 ? year : year - 1
}

interface BookingPageProps {
  session: Session
  onToast: (toast: Toast) => void
  refreshSignal: number
  language: Language
  t: TFunction
}

export default function BookingPage({
  session,
  onToast,
  refreshSignal,
  language,
  t,
}: BookingPageProps) {
  const locale = localeFor(language)
  const timeFormatter = useMemo(
    () => new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit', timeZone }),
    [locale],
  )
  const dateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(locale, { weekday: 'long', day: 'numeric', month: 'long', timeZone }),
    [locale],
  )
  const monthFormatter = useMemo(
    () => new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }),
    [locale],
  )
  const [slots, setSlots] = useState<ConsultationSlot[]>([])
  const [teacherSlots, setTeacherSlots] = useState<ConsultationSlot[]>([])
  const [teacherUsers, setTeacherUsers] = useState<Teacher[]>([])
  const [teacherId, setTeacherId] = useState('')
  const [teacherQuery, setTeacherQuery] = useState('')
  const [selectedDate, setSelectedDate] = useState('')
  const [month, setMonth] = useState(new Date())
  const [slotId, setSlotId] = useState('')
  const [reasonTitle, setReasonTitle] = useState('')
  const [reasonDescription, setReasonDescription] = useState('')
  const [consultationMode, setConsultationMode] = useState<'ONLINE' | 'OFFLINE'>('OFFLINE')
  const [loading, setLoading] = useState(true)
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [reservationsLoading, setReservationsLoading] = useState(true)
  const [dashboardNow, setDashboardNow] = useState(() => Date.now())

  async function loadReservations() {
    try {
      const data = await api.getReservations(session.token, session.userId)
      setReservations(data.filter((item) => item.studentId === session.userId))
      setDashboardNow(Date.now())
    } catch (error) {
      onToast({
        type: 'error',
        message: error instanceof Error ? error.message : t('loadMyReservationsFailed'),
      })
    } finally {
      setReservationsLoading(false)
    }
  }

  async function loadSlots() {
    try {
      setLoading(true)
      const [data, users] = await Promise.all([
        api.getSlots(session.token),
        api.getTeachers(session.token),
      ])
      setSlots(data)
      setTeacherUsers(users)
    } catch (error) {
      onToast({
        type: 'error',
        message: error instanceof Error ? error.message : t('loadSlotsFailed'),
      })
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => {
    void loadSlots()
    void loadReservations()
  }, [refreshSignal])

  useEffect(() => {
    const interval = window.setInterval(() => void loadReservations(), 30000)
    return () => window.clearInterval(interval)
  }, [session.token, session.userId])

  const teachers = useMemo(
    () =>
      teacherUsers
        .map((user) => ({
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          login: user.login,
          email: user.email,
          cabinet: user.cabinet,
          name: `${user.firstName} ${user.lastName}`,
        }))
        .map((item) => ({
          ...item,
          normalizedName: normalizeSearchText(item.name),
          normalizedLastName: normalizeSearchText(item.lastName),
          normalizedFirstName: normalizeSearchText(item.firstName),
          normalizedLogin: normalizeSearchText(item.login),
          normalizedEmail: normalizeSearchText(item.email),
          slotCount: slots.filter((slot) => slot.teacherId === item.id).length,
        }))
        .sort((left, right) => left.name.localeCompare(right.name, 'cs-CZ')),
    [slots, teacherUsers],
  )
  const teacher = teachers.find((item) => item.id === teacherId)
  const teacherMatches = useMemo(() => {
    const query = normalizeSearchText(teacherQuery)
    if (query.length < 2) return []
    return teachers
      .filter(
        (item) =>
          item.normalizedName.includes(query) ||
          item.normalizedLastName.startsWith(query) ||
          item.normalizedFirstName.startsWith(query) ||
          item.normalizedLogin.includes(query) ||
          item.normalizedEmail.includes(query),
      )
      .slice(0, 6)
  }, [teacherQuery, teachers])
  const showTeacherResults = !teacher || teacherQuery !== teacher.name
  const availableDays = useMemo(
    () =>
      new Set(
        slots
          .filter((slot) => slot.teacherId === teacherId)
          .map((slot) => slotDateKey(slot.startsAt)),
      ),
    [slots, teacherId],
  )
  const teacherSlotDays = useMemo(
    () =>
      new Set(
        teacherSlots
          .filter((slot) => slot.status === 'ACTIVE')
          .map((slot) => slotDateKey(slot.startsAt)),
      ),
    [teacherSlots],
  )
  const visibleSlots = useMemo(
    () =>
      teacherSlots.filter(
        (slot) =>
          slot.status === 'ACTIVE' &&
          slot.teacherId === teacherId &&
          slotDateKey(slot.startsAt) === selectedDate,
      ),
    [teacherSlots, teacherId, selectedDate],
  )
  const availableSlotIds = useMemo(() => new Set(slots.map((slot) => slot.id)), [slots])
  const freeVisibleSlots = useMemo(
    () => visibleSlots.filter((slot) => availableSlotIds.has(slot.id)),
    [availableSlotIds, visibleSlots],
  )
  const selectedVisibleSlot = visibleSlots.find((slot) => slot.id === slotId)
  function updateTeacherQuery(value: string) {
    setTeacherQuery(value)
    setTeacherId('')
    setSelectedDate('')
    setSlotId('')
  }
  function selectTeacher(id: string) {
    const first = slots
      .filter((slot) => slot.teacherId === id)
      .sort(
        (left, right) => new Date(left.startsAt).getTime() - new Date(right.startsAt).getTime(),
      )[0]
    const firstDate = first ? slotDateKey(first.startsAt) : ''
    setTeacherId(id)
    setTeacherQuery(teachers.find((item) => item.id === id)?.name ?? '')
    setSelectedDate(firstDate)
    setSlotId('')
    if (firstDate) setMonth(monthFor(firstDate))
    void api
      .getTeacherSlots(session.token, id)
      .then(setTeacherSlots)
      .catch(() => setTeacherSlots([]))
  }
  async function reserve(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!slotId) {
      onToast({ type: 'error', message: t('chooseSlotFirst') })
      return
    }
    const selectedSlot = slots.find((slot) => slot.id === slotId)
    if (
      selectedSlot &&
      new Date(selectedSlot.startsAt).getTime() - Date.now() < 3 * 60 * 60 * 1000
    ) {
      onToast({ type: 'error', message: t('reservationCutoffFailed') })
      return
    }
    try {
      await api.reserve(session.token, {
        slotId,
        reasonTitle,
        reasonDescription,
        consultationMode,
      })
      onToast({ type: 'success', message: t('reservationCreated') })
      setSlotId('')
      setReasonTitle('')
      setReasonDescription('')
      setConsultationMode('OFFLINE')
      await loadSlots()
      await loadReservations()
    } catch (error) {
      const isSlotConflict =
        error instanceof Error &&
        (error.message ===
          (language === 'cs'
            ? 'Tento termín právě rezervoval jiný student.'
            : 'This slot was just reserved by another student.') ||
          error.message ===
            (language === 'cs'
              ? 'Tento termín je již rezervovaný.'
              : 'This slot is already reserved.'))
      if (isSlotConflict) {
        setSlotId('')
      }
      onToast({
        type: 'error',
        message: isSlotConflict
          ? t('slotReservedByAnotherStudent')
          : error instanceof Error
            ? error.message
            : t('reservationFailed'),
        durationMs: isSlotConflict ? 10000 : undefined,
      })
      await loadSlots()
    }
  }

  const currentAcademicYear = academicYearStartYear(new Date(dashboardNow))
  const academicYearReservations = reservations.filter(
    (reservation) => academicYearStartYear(new Date(reservation.startsAt)) === currentAcademicYear,
  )
  const reservationStats = {
    total: academicYearReservations.length,
    approved: academicYearReservations.filter(
      (item) => item.status === 'CONFIRMED' && new Date(item.endsAt).getTime() >= dashboardNow,
    ).length,
    pending: academicYearReservations.filter(
      (item) => item.status === 'PENDING' && new Date(item.endsAt).getTime() >= dashboardNow,
    ).length,
    cancelled: academicYearReservations.filter(
      (item) => item.status === 'CANCELLED' && new Date(item.startsAt).getTime() >= dashboardNow,
    ).length,
    completed: academicYearReservations.filter(
      (item) => item.status === 'CONFIRMED' && new Date(item.endsAt).getTime() < dashboardNow,
    ).length,
    unsuccessful: academicYearReservations.filter(
      (item) =>
        (item.status === 'CANCELLED' && new Date(item.startsAt).getTime() < dashboardNow) ||
        (item.status === 'PENDING' && new Date(item.endsAt).getTime() < dashboardNow),
    ).length,
  }
  const teacherCounts = [
    ...academicYearReservations
      .reduce((counts, reservation) => {
        const current = counts.get(reservation.teacherId)
        counts.set(reservation.teacherId, {
          id: reservation.teacherId,
          name: reservation.teacherName,
          count: (current?.count ?? 0) + 1,
        })
        return counts
      }, new Map<string, { id: string; name: string; count: number }>())
      .values(),
  ].sort(
    (left, right) =>
      right.count - left.count ||
      left.name.localeCompare(right.name, language === 'cs' ? 'cs-CZ' : 'en'),
  )

  return (
    <main>
      <section className="teacher-panel">
        <div>
          <span className="label">{t('teacherSearch')}</span>
          {teacher ? (
            <div className="selected-teacher">
              <h2>
                {teacher.firstName} {teacher.lastName}
              </h2>
              <span>{teacher.login}</span>
              <span>{teacher.email}</span>
              {teacher.cabinet && (
                <span>
                  {t('cabinet')}: {teacher.cabinet}
                </span>
              )}
            </div>
          ) : (
            <h2>{t('enterTeacherName')}</h2>
          )}
        </div>
        <div className="teacher-search">
          <label htmlFor="teacher-search">{t('teacher')}</label>
          <input
            id="teacher-search"
            type="search"
            value={teacherQuery}
            onChange={(event) => updateTeacherQuery(event.target.value)}
            placeholder={t('teacherPlaceholder')}
            autoComplete="off"
          />
          {showTeacherResults && teacherQuery.trim().length >= 2 && (
            <div className="teacher-results">
              {teacherMatches.length ? (
                teacherMatches.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className="teacher-result"
                    onClick={() => selectTeacher(item.id)}
                  >
                    <strong>{item.name}</strong>
                    <b>{item.login}</b>
                    <b>{item.email}</b>
                    {item.cabinet && (
                      <b>
                        {t('cabinet')}: {item.cabinet}
                      </b>
                    )}
                    <span>
                      {item.slotCount} {t('freeSlots')}
                    </span>
                  </button>
                ))
              ) : (
                <span className="muted">{t('noTeacherFound')}</span>
              )}
            </div>
          )}
        </div>
      </section>
      {!teacher && (
        <section className="student-dashboard" aria-labelledby="student-dashboard-title">
          <div className="student-dashboard-heading">
            <div>
              <span className="label">{t('studentDashboardEyebrow')}</span>
              <h2 id="student-dashboard-title">{t('studentDashboardTitle')}</h2>
            </div>
            <span className="academic-year-badge">
              {currentAcademicYear}/{currentAcademicYear + 1} · {t('academicYear')}
            </span>
          </div>
          {reservationsLoading ? (
            <p className="muted">{t('loading')}</p>
          ) : academicYearReservations.length === 0 ? (
            <p className="dashboard-empty">{t('noAcademicYearConsultations')}</p>
          ) : null}
          <div className="dashboard-stat-grid">
            {(
              [
                ['total', 'dashboardTotal', '✦'],
                ['approved', 'dashboardApproved', '✓'],
                ['pending', 'dashboardPending', '◷'],
                ['cancelled', 'dashboardCancelled', '×'],
                ['completed', 'dashboardCompleted', '★'],
                ['unsuccessful', 'dashboardUnsuccessful', '↗'],
              ] as const
            ).map(([key, label, icon]) => (
              <article className={`dashboard-stat dashboard-stat-${key}`} key={key}>
                <div className="dashboard-stat-heading">
                  <span className="dashboard-stat-icon" aria-hidden="true">
                    {icon}
                  </span>
                  <span className="dashboard-stat-label">{t(label)}</span>
                </div>
                <strong>{reservationStats[key]}</strong>
              </article>
            ))}
          </div>
          {!reservationsLoading && teacherCounts.length >= 3 && (
            <section className="top-teachers" aria-labelledby="top-teachers-title">
              <div>
                <h3 id="top-teachers-title">{t('topTeachers')}</h3>
                <p>{t('topTeachersHint')}</p>
              </div>
              <div className="top-teacher-list">
                {teacherCounts.slice(0, 3).map((teacher, index) => (
                  <article className="top-teacher" key={teacher.id}>
                    <span className={`top-teacher-rank rank-${index + 1}`}>{index + 1}</span>
                    <strong>{teacher.name}</strong>
                    <span>
                      {teacher.count} {t('consultationCount')}
                    </span>
                  </article>
                ))}
              </div>
            </section>
          )}
        </section>
      )}
      {teacher ? (
        <div className="booking-grid">
          <section className="card">
            <h2 className="calendar-title">{t('selectDate')}</h2>
            <div className="calendar-content">
              <div className="calendar-header">
                <button
                  type="button"
                  onClick={() =>
                    setMonth(
                      (current) => new Date(current.getFullYear(), current.getMonth() - 1, 1),
                    )
                  }
                  aria-label={t('previousMonth')}
                >
                  ‹
                </button>
                <strong>{monthFormatter.format(month)}</strong>
                <button
                  type="button"
                  onClick={() =>
                    setMonth(
                      (current) => new Date(current.getFullYear(), current.getMonth() + 1, 1),
                    )
                  }
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
                {calendarDays(month).map((day) => {
                  const key = dateKey(day)
                  const otherMonth = day.getMonth() !== month.getMonth()
                  const weekend = day.getDay() === 0 || day.getDay() === 6
                  const available = availableDays.has(key)
                  const occupied = teacherSlotDays.has(key) && !available
                  const selected = selectedDate === key
                  return (
                    <button
                      key={key}
                      type="button"
                      disabled={otherMonth}
                      onClick={() => {
                        setSelectedDate(key)
                        setSlotId('')
                      }}
                      className={`calendar-day ${available && !otherMonth ? 'available' : ''} ${occupied && !otherMonth ? 'occupied' : ''} ${selected ? 'selected' : ''} ${otherMonth ? 'other-month' : ''} ${weekend && !otherMonth ? 'weekend' : ''}`}
                    >
                      <span>{day.getDate()}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          </section>
          <section className="card student-slot-card">
            <div className="section-title">
              <div className="slot-heading">
                <h2>{t('availableSlots')}</h2>
                <p>
                  {selectedDate ? dateFormatter.format(new Date(`${selectedDate}T12:00:00`)) : ''}
                </p>
              </div>
              <span className="count">
                {freeVisibleSlots.length} {t('free')}
              </span>
            </div>
            <div className="slot-list">
              {loading ? (
                <span className="muted">{t('loadingSlots')}</span>
              ) : visibleSlots.length ? (
                visibleSlots.map((slot) => (
                  <button
                    key={slot.id}
                    type="button"
                    disabled={!availableSlotIds.has(slot.id)}
                    className={`${slotId === slot.id ? 'slot selected' : 'slot'} ${!availableSlotIds.has(slot.id) ? 'occupied' : ''}`}
                    onClick={() => {
                      setSlotId(slot.id)
                      setConsultationMode(
                        slot.onlineAvailable !== false && slot.offlineAvailable === false
                          ? 'ONLINE'
                          : 'OFFLINE',
                      )
                    }}
                  >
                    {timeFormatter.format(new Date(slot.startsAt))}–
                    {timeFormatter.format(new Date(slot.endsAt))}
                    {!availableSlotIds.has(slot.id) && (
                      <span className="slot-occupied-label"> · {t('occupied')}</span>
                    )}
                  </button>
                ))
              ) : (
                <span className="muted">{t('noSlotsForDay')}</span>
              )}
            </div>
            <form onSubmit={reserve}>
              {selectedVisibleSlot && (
                <fieldset className="consultation-mode-options">
                  <legend>{t('consultationMode')}</legend>
                  {selectedVisibleSlot.onlineAvailable !== false &&
                  selectedVisibleSlot.offlineAvailable !== false ? (
                    <>
                      <label>
                        <input
                          type="radio"
                          name="consultation-mode"
                          value="OFFLINE"
                          checked={consultationMode === 'OFFLINE'}
                          onChange={() => setConsultationMode('OFFLINE')}
                        />
                        {t('offlineConsultation')}
                        {teacher.cabinet ? ` · ${teacher.cabinet}` : ''}
                      </label>
                      <label>
                        <input
                          type="radio"
                          name="consultation-mode"
                          value="ONLINE"
                          checked={consultationMode === 'ONLINE'}
                          onChange={() => setConsultationMode('ONLINE')}
                        />
                        {t('onlineConsultation')}
                      </label>
                    </>
                  ) : (
                    <span>
                      {selectedVisibleSlot.onlineAvailable !== false
                        ? `${t('onlineOnly')}`
                        : `${t('offlineOnly')}${teacher.cabinet ? ` · ${teacher.cabinet}` : ''}`}
                    </span>
                  )}
                </fieldset>
              )}
              <div className="labeled-field">
                <label htmlFor="reason-title">{t('reasonTitle')}</label>
                <input
                  id="reason-title"
                  required
                  maxLength={150}
                  value={reasonTitle}
                  onChange={(event) => setReasonTitle(event.target.value)}
                  placeholder={t('reasonTitlePlaceholder')}
                />
              </div>
              <div className="labeled-field">
                <label htmlFor="reason-description">{t('reasonDescription')}</label>
                <textarea
                  id="reason-description"
                  required
                  maxLength={1000}
                  value={reasonDescription}
                  onChange={(event) => setReasonDescription(event.target.value)}
                  placeholder={t('reasonDescriptionPlaceholder')}
                />
              </div>
              <button className="reserve-button" type="submit">
                {t('reserveConsultation')}
              </button>
            </form>
          </section>
        </div>
      ) : null}
    </main>
  )
}
