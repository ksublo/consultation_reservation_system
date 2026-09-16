import { useEffect, useState } from 'react'
import { api } from './api/client'
import Navigation from './components/Navigation'
import Login from './features/auth/Login'
import BookingPage from './features/booking/BookingPage'
import TeacherPage from './features/teacher/TeacherPage'
import type { Session, Toast, UserRole } from './types/api'
import './index.css'

function storedSession(): Session | null {
  const stored = sessionStorage.getItem('session')
  if (!stored) return null
  try { return JSON.parse(stored) as Session }
  catch { sessionStorage.removeItem('session'); return null }
}

export default function App() {
  const [session, setSession] = useState<Session | null>(storedSession)
  const [loginRole, setLoginRole] = useState<UserRole | null>(null)
  const [toast, setToast] = useState<Toast | null>(null)
  const [refreshSignal, setRefreshSignal] = useState(0)
  const [teacherView, setTeacherView] = useState<'slots' | 'requests'>('slots')
  useEffect(() => { if (!toast) return; const timeout = window.setTimeout(() => setToast(null), 5000); return () => window.clearTimeout(timeout) }, [toast])
  function signIn(newSession: Session) { sessionStorage.setItem('session', JSON.stringify(newSession)); setSession(newSession) }
  async function logout() { if (session) await api.logout(session.token).catch(() => undefined); sessionStorage.removeItem('session'); setSession(null); setLoginRole(null) }
  if (!session && !loginRole) return <main className="login-page"><section className="login-card"><p>REZERVACE KONZULTACÍ</p><h1>Rezervujte si konzultaci</h1><div className="role-buttons"><button type="button" onClick={() => setLoginRole('STUDENT')}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7 8c0-3.3 3.1-6 7-6s7 2.7 7 6"/></svg><span>Vstup pro studenty</span></button><button type="button" onClick={() => setLoginRole('TEACHER')}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m4 10 8-5 8 5-8 5-8-5Zm3 3v4c0 1.5 2.2 3 5 3s5-1.5 5-3v-4"/></svg><span>Vstup pro pedagogy</span></button></div></section></main>
  if (!session && loginRole) return <Login role={loginRole} onBack={() => setLoginRole(null)} onLogin={signIn} />
  if (!session) return null
  const navigation = <Navigation activeRole={session.activeRole} userLogin={session.login} onLogout={() => void logout()} onRefresh={session.activeRole === 'STUDENT' ? () => setRefreshSignal((current) => current + 1) : undefined} teacherView={teacherView} onTeacherViewChange={setTeacherView} />
  if (session.activeRole === 'TEACHER') return <div className="app-shell">{navigation}{toast && <div className={`toast ${toast.type}`}>{toast.type === 'success' && '✓ '}{toast.message}</div>}<TeacherPage session={session} onToast={setToast} view={teacherView} /></div>
  return <div className="app-shell">{navigation}{toast && <div className={`toast ${toast.type}`}>{toast.type === 'success' && '✓ '}{toast.message}</div>}<BookingPage session={session} onToast={setToast} refreshSignal={refreshSignal} /></div>
}
