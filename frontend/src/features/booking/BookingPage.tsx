import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { api } from '../../api/client'
import type { ConsultationSlot, Session, Toast } from '../../types/api'

const timeZone = 'Europe/Prague'
const timeFormatter = new Intl.DateTimeFormat('cs-CZ', { hour: '2-digit', minute: '2-digit', timeZone })
const dateFormatter = new Intl.DateTimeFormat('cs-CZ', { weekday: 'long', day: 'numeric', month: 'long', timeZone })
const monthFormatter = new Intl.DateTimeFormat('cs-CZ', { month: 'long', year: 'numeric' })
const weekdays = ['Po', 'Út', 'St', 'Čt', 'Pá', 'So', 'Ne']
const slotDateKey = (value: string) => new Intl.DateTimeFormat('sv-SE', { timeZone }).format(new Date(value))
const dateKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
const monthFor = (key: string) => { const [year, month] = key.split('-').map(Number); return new Date(year, month - 1, 1) }
function calendarDays(month: Date): Date[] { const start = new Date(month.getFullYear(), month.getMonth(), 1); start.setDate(start.getDate() - ((start.getDay() + 6) % 7)); return Array.from({ length: 42 }, (_, index) => { const day = new Date(start); day.setDate(start.getDate() + index); return day }) }

interface BookingPageProps { session: Session; onToast: (toast: Toast) => void; refreshSignal: number }

export default function BookingPage({ session, onToast, refreshSignal }: BookingPageProps) {
  const [slots, setSlots] = useState<ConsultationSlot[]>([])
  const [teacherId, setTeacherId] = useState('')
  const [selectedDate, setSelectedDate] = useState('')
  const [month, setMonth] = useState(new Date())
  const [slotId, setSlotId] = useState('')
  const [reasonTitle, setReasonTitle] = useState('')
  const [reasonDescription, setReasonDescription] = useState('')
  const [loading, setLoading] = useState(true)

  async function loadSlots() {
    try { setLoading(true); const data = await api.getSlots(session.token); setSlots(data); if (data.length) { setTeacherId((current) => current || data[0].teacherId); setSelectedDate((current) => current || slotDateKey(data[0].startsAt)) } }
    catch (error) { onToast({ type: 'error', message: error instanceof Error ? error.message : 'Nepodařilo se načíst dostupné termíny.' }) }
    finally { setLoading(false) }
  }
  useEffect(() => { void loadSlots() }, [refreshSignal])

  const teachers = useMemo(() => [...new Map(slots.map((slot) => [slot.teacherId, { id: slot.teacherId, name: slot.teacherName }])).values()], [slots])
  const teacher = teachers.find((item) => item.id === teacherId)
  const availableDays = useMemo(() => new Set(slots.filter((slot) => slot.teacherId === teacherId).map((slot) => slotDateKey(slot.startsAt))), [slots, teacherId])
  const visibleSlots = useMemo(() => slots.filter((slot) => slot.teacherId === teacherId && slotDateKey(slot.startsAt) === selectedDate), [slots, teacherId, selectedDate])

  function selectTeacher(id: string) { const first = slots.find((slot) => slot.teacherId === id); const firstDate = first ? slotDateKey(first.startsAt) : ''; setTeacherId(id); setSelectedDate(firstDate); setSlotId(''); if (firstDate) setMonth(monthFor(firstDate)) }
  async function reserve(event: FormEvent<HTMLFormElement>) { event.preventDefault(); if (!slotId) { onToast({ type: 'error', message: 'Nejdřív vyberte volný čas konzultace.' }); return }; try { await api.reserve(session.token, { slotId, studentId: session.userId, reasonTitle, reasonDescription }); onToast({ type: 'success', message: 'Žádost o rezervaci byla odeslána pedagogovi ke schválení.' }); setSlotId(''); setReasonTitle(''); setReasonDescription(''); await loadSlots() } catch (error) { onToast({ type: 'error', message: error instanceof Error ? error.message : 'Rezervaci se nepodařilo vytvořit.' }) } }

  return <main><section className="teacher-panel"><div><span className="label">VYBRANÝ PEDAGOG</span><h2>{teacher?.name ?? 'Načítám termíny…'}</h2></div><label className="teacher-select">Pedagog<select value={teacherId} onChange={(event) => selectTeacher(event.target.value)}>{teachers.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label></section><div className="booking-grid"><section className="card"><h2>Vyberte datum</h2><div className="calendar-header"><button type="button" onClick={() => setMonth((current) => new Date(current.getFullYear(), current.getMonth() - 1, 1))} aria-label="Předchozí měsíc">‹</button><strong>{monthFormatter.format(month)}</strong><button type="button" onClick={() => setMonth((current) => new Date(current.getFullYear(), current.getMonth() + 1, 1))} aria-label="Další měsíc">›</button></div><div className="weekday-row">{weekdays.map((day) => <span key={day}>{day}</span>)}</div><div className="calendar-grid">{calendarDays(month).map((day) => { const key = dateKey(day); const available = availableDays.has(key); const selected = selectedDate === key; return <button key={key} type="button" disabled={!available} onClick={() => { setSelectedDate(key); setSlotId('') }} className={`calendar-day ${available ? 'available' : ''} ${selected ? 'selected' : ''} ${day.getMonth() !== month.getMonth() ? 'other-month' : ''}`}><span>{day.getDate()}</span></button> })}</div></section><section className="card"><div className="section-title"><div><h2>Dostupné termíny</h2><p>{selectedDate ? dateFormatter.format(new Date(`${selectedDate}T12:00:00`)) : ''}</p></div><span className="count">{visibleSlots.length} volné</span></div><div className="slot-list">{loading ? <span className="muted">Načítám termíny…</span> : visibleSlots.length ? visibleSlots.map((slot) => <button key={slot.id} type="button" className={slotId === slot.id ? 'slot selected' : 'slot'} onClick={() => setSlotId(slot.id)}>{timeFormatter.format(new Date(slot.startsAt))}–{timeFormatter.format(new Date(slot.endsAt))}</button>) : <span className="muted">Pro tento den nejsou volné termíny.</span>}</div><form onSubmit={reserve}><label htmlFor="reason-title">Název konzultace</label><input id="reason-title" required maxLength={150} value={reasonTitle} onChange={(event) => setReasonTitle(event.target.value)} placeholder="Např. návrh databáze" /><label htmlFor="reason-description">Poznámka pro pedagoga</label><textarea id="reason-description" required maxLength={1000} value={reasonDescription} onChange={(event) => setReasonDescription(event.target.value)} placeholder="Stručně popište, co potřebujete konzultovat." /><button className="reserve-button" type="submit">Rezervovat konzultaci</button></form></section></div></main>
}
