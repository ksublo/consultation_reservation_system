import { useEffect, useMemo, useState } from 'react'
import './index.css'
import Login from './Login.jsx'
import logo from './assets/vsb-logo.png'

const STUDENT_ID = '33333333-3333-3333-3333-333333333333'
const LANGUAGE = 'cs'
const translations = {
  cs: {
    title: 'Rezervace konzultace', subtitle: 'Vyberte pedagoga, datum a volný termín.', refresh: 'Obnovit termíny',
    selectedTeacher: 'VYBRANÝ PEDAGOG', teacher: 'Pedagog', chooseDate: 'Vyberte datum',
    calendarHint: 'Zeleně jsou označeny dny s volnými termíny.', availableTerms: 'Dostupné termíny', free: 'volné',
    loading: 'Načítám termíny…', noTerms: 'Pro tento den nejsou volné termíny.', reasonTitle: 'Název konzultace',
    reasonPlaceholder: 'Např. návrh databáze', note: 'Poznámka pro pedagoga', notePlaceholder: 'Stručně popište, co potřebujete konzultovat.',
    reserve: 'Rezervovat konzultaci', loadError: 'Nepodařilo se načíst dostupné termíny.', chooseSlot: 'Nejdřív vyberte volný čas konzultace.',
    reservationError: 'Rezervaci se nepodařilo vytvořit.', reservationSuccess: 'Žádost o rezervaci byla odeslána pedagogovi ke schválení.',
    previousMonth: 'Předchozí měsíc', nextMonth: 'Další měsíc',
  },
}
const text = translations[LANGUAGE]
const timeZone = 'Europe/Prague'
const timeFormatter = new Intl.DateTimeFormat('cs-CZ', { hour: '2-digit', minute: '2-digit', timeZone })
const dateFormatter = new Intl.DateTimeFormat('cs-CZ', { weekday: 'long', day: 'numeric', month: 'long', timeZone })
const monthFormatter = new Intl.DateTimeFormat('cs-CZ', { month: 'long', year: 'numeric' })
const weekdays = ['Po', 'Út', 'St', 'Čt', 'Pá', 'So', 'Ne']

function slotDateKey(value) { return new Intl.DateTimeFormat('sv-SE', { timeZone }).format(new Date(value)) }
function dateKey(date) { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}` }
function monthFor(key) { const [year, month] = key.split('-').map(Number); return new Date(year, month - 1, 1) }
function calendarDays(month) {
  const start = new Date(month.getFullYear(), month.getMonth(), 1)
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7))
  return Array.from({ length: 42 }, (_, index) => { const day = new Date(start); day.setDate(start.getDate() + index); return day })
}

export default function App() {
  const [slots, setSlots] = useState([])
  const [session, setSession] = useState(() => JSON.parse(sessionStorage.getItem('session') || 'null'))
  const [loginRole, setLoginRole] = useState(null)
  const [teacherId, setTeacherId] = useState('')
  const [selectedDate, setSelectedDate] = useState('')
  const [month, setMonth] = useState(new Date())
  const [slotId, setSlotId] = useState('')
  const [reasonTitle, setReasonTitle] = useState('')
  const [reasonDescription, setReasonDescription] = useState('')
  const [toast, setToast] = useState(null)
  const [loading, setLoading] = useState(true)

  function showToast(type, message) { setToast({ type, message }) }
  useEffect(() => {
    if (!toast) return undefined
    const timeout = setTimeout(() => setToast(null), 5000)
    return () => clearTimeout(timeout)
  }, [toast])

  async function loadSlots() {
    try {
      setLoading(true)
      const response = await fetch('/api/slots', { headers: { Authorization: `Bearer ${session.token}` } })
      if (!response.ok) throw new Error(text.loadError)
      const data = await response.json()
      setSlots(data)
      if (data.length) {
        const first = data[0]
        setTeacherId(current => current || first.teacherId)
        setSelectedDate(current => current || slotDateKey(first.startsAt))
      }
    } catch (requestError) { showToast('error', requestError.message) } finally { setLoading(false) }
  }
  useEffect(() => { loadSlots() }, [])

  const teachers = useMemo(() => [...new Map(slots.map(slot => [slot.teacherId, { id: slot.teacherId, name: slot.teacherName }])).values()], [slots])
  const teacher = teachers.find(item => item.id === teacherId)
  const availableDays = useMemo(() => new Set(slots.filter(slot => slot.teacherId === teacherId).map(slot => slotDateKey(slot.startsAt))), [slots, teacherId])
  const visibleSlots = useMemo(() => slots.filter(slot => slot.teacherId === teacherId && slotDateKey(slot.startsAt) === selectedDate), [slots, teacherId, selectedDate])

  function selectTeacher(id) {
    const first = slots.find(slot => slot.teacherId === id)
    const firstDate = first ? slotDateKey(first.startsAt) : ''
    setTeacherId(id); setSelectedDate(firstDate); setSlotId('')
    if (firstDate) setMonth(monthFor(firstDate))
  }
  async function reserve(event) {
    event.preventDefault()
    if (!slotId) { showToast('error', text.chooseSlot); return }
    try {
      setToast(null)
      const response = await fetch('/api/reservations', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ slotId, studentId: STUDENT_ID, reasonTitle, reasonDescription }) })
      const data = await response.json()
      if (!response.ok) throw new Error(data.message || text.reservationError)
      showToast('success', text.reservationSuccess); setSlotId(''); setReasonTitle(''); setReasonDescription(''); await loadSlots()
    } catch (requestError) { showToast('error', requestError.message) }
  }

if (!session && !loginRole) return <main className="login-page"><section className="login-card"><p>REZERVACE KONZULTACÍ</p><h1>Rezervujte si konzultaci</h1><div className="role-buttons"><button onClick={() => setLoginRole('STUDENT')}>Jsem student</button><button onClick={() => setLoginRole('TEACHER')}>Jsem pedagog</button></div></section></main>
  if (!session) return <Login role={loginRole} onBack={() => setLoginRole(null)} onLogin={data => { sessionStorage.setItem('session', JSON.stringify(data)); setSession(data) }} />
  if (session.activeRole === 'TEACHER') return <main className="login-page"><section className="login-card"><h1>Vítejte, {session.firstName}</h1><p>Pedagogická část bude navazovat tvorbou termínů.</p><button onClick={logout}>Odhlásit</button></section></main>

async function logout() {
    try { await fetch('/api/auth/logout', { method: 'POST', headers: { Authorization: `Bearer ${session.token}` } }) } finally { sessionStorage.removeItem('session'); setSession(null); setLoginRole(null) }
  }

  return <div className="app-shell">
    <header><img src={logo} alt="VŠB Technical University of Ostrava" className="h-20 w-auto" /><span>Rezervace konzultací</span></header>
    <main>
      <div className="page-heading"><div><h1>{text.title}</h1><p>{text.subtitle}</p></div><div className="header-actions"><button className="outline-button" onClick={loadSlots}>↻ {text.refresh}</button><button className="logout-button" onClick={logout}>Odhlásit se</button></div></div>
      {toast && <div className={`toast ${toast.type}`}>{toast.type === 'success' && '✓ '}{toast.message}</div>}
      <section className="teacher-panel"><div><span className="label">{text.selectedTeacher}</span><h2>{teacher?.name || text.loading}</h2></div><label className="teacher-select">{text.teacher}<select value={teacherId} onChange={event => selectTeacher(event.target.value)}>{teachers.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label></section>
      <div className="booking-grid">
        <section className="card"><h2>{text.chooseDate}</h2><p className="muted">{text.calendarHint}</p><div className="calendar-header"><button onClick={() => setMonth(current => new Date(current.getFullYear(), current.getMonth() - 1, 1))} aria-label={text.previousMonth}>‹</button><strong>{monthFormatter.format(month)}</strong><button onClick={() => setMonth(current => new Date(current.getFullYear(), current.getMonth() + 1, 1))} aria-label={text.nextMonth}>›</button></div><div className="weekday-row">{weekdays.map(day => <span key={day}>{day}</span>)}</div><div className="calendar-grid">{calendarDays(month).map(day => { const key = dateKey(day); const available = availableDays.has(key); const selected = selectedDate === key; return <button key={key} disabled={!available} onClick={() => { setSelectedDate(key); setSlotId('') }} className={`calendar-day ${available ? 'available' : ''} ${selected ? 'selected' : ''} ${day.getMonth() !== month.getMonth() ? 'other-month' : ''}`}><span>{day.getDate()}</span>{available && <i />}</button> })}</div><div className="legend"><span><i className="available-dot" /> {text.availableTerms}</span><span><i className="selected-dot" /> Vybraný den</span></div></section>
        <section className="card"><div className="section-title"><div><h2>{text.availableTerms}</h2><p>{selectedDate ? dateFormatter.format(new Date(`${selectedDate}T12:00:00`)) : ''}</p></div><span className="count">{visibleSlots.length} {text.free}</span></div><div className="slot-list">{loading ? <span className="muted">{text.loading}</span> : visibleSlots.length ? visibleSlots.map(slot => <button key={slot.id} className={slotId === slot.id ? 'slot selected' : 'slot'} onClick={() => setSlotId(slot.id)}>{timeFormatter.format(new Date(slot.startsAt))}–{timeFormatter.format(new Date(slot.endsAt))}</button>) : <span className="muted">{text.noTerms}</span>}</div><form onSubmit={reserve}><label>{text.reasonTitle}</label><input required maxLength="150" value={reasonTitle} onChange={event => setReasonTitle(event.target.value)} placeholder={text.reasonPlaceholder} /><label>{text.note}</label><textarea required value={reasonDescription} onChange={event => setReasonDescription(event.target.value)} maxLength="1000" placeholder={text.notePlaceholder} /><button className="reserve-button" type="submit">{text.reserve}</button></form></section>
      </div>
    </main>
  </div>
}