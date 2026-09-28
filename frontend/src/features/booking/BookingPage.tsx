import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { api } from '../../api/client'
import type { Language, TFunction } from '../../i18n'
import { localeFor } from '../../i18n'
import type { ConsultationSlot, Session, Teacher, Toast } from '../../types/api'

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
  const [teacherUsers, setTeacherUsers] = useState<Teacher[]>([])
  const [teacherId, setTeacherId] = useState('')
  const [teacherQuery, setTeacherQuery] = useState('')
  const [selectedDate, setSelectedDate] = useState('')
  const [month, setMonth] = useState(new Date())
  const [slotId, setSlotId] = useState('')
  const [reasonTitle, setReasonTitle] = useState('')
  const [reasonDescription, setReasonDescription] = useState('')
  const [loading, setLoading] = useState(true)

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
  }, [refreshSignal])

  const teachers = useMemo(
    () =>
      teacherUsers
        .map((user) => ({
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          login: user.login,
          email: user.email,
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
  const visibleSlots = useMemo(
    () =>
      slots.filter(
        (slot) => slot.teacherId === teacherId && slotDateKey(slot.startsAt) === selectedDate,
      ),
    [slots, teacherId, selectedDate],
  )

  function updateTeacherQuery(value: string) {
    setTeacherQuery(value)
    setTeacherId('')
    setSelectedDate('')
    setSlotId('')
  }
  function selectTeacher(id: string) {
    const first = slots.find((slot) => slot.teacherId === id)
    const firstDate = first ? slotDateKey(first.startsAt) : ''
    setTeacherId(id)
    setTeacherQuery('')
    setSelectedDate(firstDate)
    setSlotId('')
    if (firstDate) setMonth(monthFor(firstDate))
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
        studentId: session.userId,
        reasonTitle,
        reasonDescription,
      })
      onToast({ type: 'success', message: t('reservationCreated') })
      setSlotId('')
      setReasonTitle('')
      setReasonDescription('')
      await loadSlots()
    } catch (error) {
      onToast({
        type: 'error',
        message: error instanceof Error ? error.message : t('reservationFailed'),
      })
    }
  }

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
      {teacher ? (
        <div className="booking-grid">
          <section className="card">
            <h2>{t('selectDate')}</h2>
            <div className="calendar-header">
              <button
                type="button"
                onClick={() =>
                  setMonth((current) => new Date(current.getFullYear(), current.getMonth() - 1, 1))
                }
                aria-label={t('previousMonth')}
              >
                ‹
              </button>
              <strong>{monthFormatter.format(month)}</strong>
              <button
                type="button"
                onClick={() =>
                  setMonth((current) => new Date(current.getFullYear(), current.getMonth() + 1, 1))
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
                const available = availableDays.has(key)
                const selected = selectedDate === key
                return (
                  <button
                    key={key}
                    type="button"
                    disabled={!available}
                    onClick={() => {
                      setSelectedDate(key)
                      setSlotId('')
                    }}
                    className={`calendar-day ${available ? 'available' : ''} ${selected ? 'selected' : ''} ${day.getMonth() !== month.getMonth() ? 'other-month' : ''}`}
                  >
                    <span>{day.getDate()}</span>
                  </button>
                )
              })}
            </div>
          </section>
          <section className="card">
            <div className="section-title">
              <div>
                <h2>{t('availableSlots')}</h2>
                <p>
                  {selectedDate ? dateFormatter.format(new Date(`${selectedDate}T12:00:00`)) : ''}
                </p>
              </div>
              <span className="count">
                {visibleSlots.length} {t('free')}
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
                    className={slotId === slot.id ? 'slot selected' : 'slot'}
                    onClick={() => setSlotId(slot.id)}
                  >
                    {timeFormatter.format(new Date(slot.startsAt))}–
                    {timeFormatter.format(new Date(slot.endsAt))}
                  </button>
                ))
              ) : (
                <span className="muted">{t('noSlotsForDay')}</span>
              )}
            </div>
            <form onSubmit={reserve}>
              <label htmlFor="reason-title">{t('reasonTitle')}</label>
              <input
                id="reason-title"
                required
                maxLength={150}
                value={reasonTitle}
                onChange={(event) => setReasonTitle(event.target.value)}
                placeholder={t('reasonTitlePlaceholder')}
              />
              <label htmlFor="reason-description">{t('reasonDescription')}</label>
              <textarea
                id="reason-description"
                required
                maxLength={1000}
                value={reasonDescription}
                onChange={(event) => setReasonDescription(event.target.value)}
                placeholder={t('reasonDescriptionPlaceholder')}
              />
              <button className="reserve-button" type="submit">
                {t('reserveConsultation')}
              </button>
            </form>
          </section>
        </div>
      ) : (
        <section className="card empty-selection">
          <h2>{t('findTeacher')}</h2>
          <p className="muted">{t('findTeacherHint')}</p>
        </section>
      )}
    </main>
  )
}
