import { useEffect, useState } from 'react'
import { api } from './api/client'
import Navigation from './components/Navigation'
import Login from './features/auth/Login'
import BookingPage from './features/booking/BookingPage'
import MyReservationsPage from './features/booking/MyReservationsPage'
import TeacherPage from './features/teacher/TeacherPage'
import type { Session, Toast, UserRole } from './types/api'
import { createTranslator, type Language } from './i18n'
import './index.css'

function storedSession(): Session | null {
  const stored = sessionStorage.getItem('session')
  if (!stored) return null
  try { return JSON.parse(stored) as Session }
  catch { sessionStorage.removeItem('session'); return null }
}

function storedLanguage(): Language {
  return sessionStorage.getItem('language') === 'en' ? 'en' : 'cs'
}

export default function App() {
  const [session, setSession] = useState<Session | null>(storedSession)
  const [language, setLanguageState] = useState<Language>(storedLanguage)
  const [loginRole, setLoginRole] = useState<UserRole | null>(null)
  const [toast, setToast] = useState<Toast | null>(null)
  const [refreshSignal, setRefreshSignal] = useState(0)
  const [teacherView, setTeacherView] = useState<'slots' | 'requests'>('slots')
  const [studentView, setStudentView] = useState<'booking' | 'reservations'>('booking')
  const t = createTranslator(language)
  useEffect(() => { api.setLanguage(language); document.documentElement.lang = language }, [language])
  useEffect(() => { if (!toast) return; const timeout = window.setTimeout(() => setToast(null), 5000); return () => window.clearTimeout(timeout) }, [toast])
  function setLanguage(nextLanguage: Language) { sessionStorage.setItem('language', nextLanguage); setLanguageState(nextLanguage) }
  function signIn(newSession: Session) { sessionStorage.setItem('session', JSON.stringify(newSession)); setSession(newSession) }
  async function logout() { if (session) await api.logout(session.token).catch(() => undefined); sessionStorage.removeItem('session'); setSession(null); setLoginRole(null) }
  if (!session && !loginRole) return <main className="login-page"><section className="login-card"><div className="language-switch"><button className={language === 'cs' ? 'active' : ''} type="button" onClick={() => setLanguage('cs')}>CS</button><button className={language === 'en' ? 'active' : ''} type="button" onClick={() => setLanguage('en')}>EN</button></div><p>{t('landingEyebrow')}</p><h1>{t('landingTitle')}</h1><div className="role-buttons"><button type="button" onClick={() => setLoginRole('STUDENT')}>{t('studentRoleButton')}</button><button type="button" onClick={() => setLoginRole('TEACHER')}>{t('teacherRoleButton')}</button></div></section></main>
  if (!session && loginRole) return <Login role={loginRole} onBack={() => setLoginRole(null)} onLogin={signIn} t={t} />
  if (!session) return null
  const navigation = <Navigation activeRole={session.activeRole} userLogin={session.login} onLogout={() => void logout()} onRefresh={session.activeRole === 'STUDENT' ? () => setRefreshSignal((current) => current + 1) : undefined} teacherView={teacherView} onTeacherViewChange={setTeacherView} studentView={studentView} onStudentViewChange={setStudentView} language={language} onLanguageChange={setLanguage} t={t} />
  if (session.activeRole === 'TEACHER') return <div className="app-shell">{navigation}{toast && <div className={`toast ${toast.type}`}>{toast.type === 'success' && '✓ '}{toast.message}</div>}<TeacherPage session={session} onToast={setToast} view={teacherView} language={language} t={t} /></div>
  return <div className="app-shell">{navigation}{toast && <div className={`toast ${toast.type}`}>{toast.type === 'success' && '✓ '}{toast.message}</div>}{studentView === 'booking' ? <BookingPage session={session} onToast={setToast} refreshSignal={refreshSignal} language={language} t={t} /> : <MyReservationsPage session={session} onToast={setToast} refreshSignal={refreshSignal} language={language} t={t} />}</div>
}
