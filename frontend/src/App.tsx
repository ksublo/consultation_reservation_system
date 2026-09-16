import { useEffect, useState } from 'react'
import { api } from './api/client'
import Navigation from './components/Navigation'
import Login from './features/auth/Login'
import BookingPage from './features/booking/BookingPage'
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
  useEffect(() => { if (!toast) return; const timeout = window.setTimeout(() => setToast(null), 5000); return () => window.clearTimeout(timeout) }, [toast])
  function signIn(newSession: Session) { sessionStorage.setItem('session', JSON.stringify(newSession)); setSession(newSession) }
  async function logout() { if (session) await api.logout(session.token).catch(() => undefined); sessionStorage.removeItem('session'); setSession(null); setLoginRole(null) }
  if (!session && !loginRole) return <main className="login-page"><section className="login-card"><p>REZERVACE KONZULTACÍ</p><h1>Rezervujte si konzultaci</h1><div className="role-buttons"><button type="button" onClick={() => setLoginRole('STUDENT')}>Jsem student</button><button type="button" onClick={() => setLoginRole('TEACHER')}>Jsem pedagog</button></div></section></main>
  if (!session && loginRole) return <Login role={loginRole} onBack={() => setLoginRole(null)} onLogin={signIn} />
  if (!session) return null
  const navigation = <Navigation activeRole={session.activeRole} userLogin={session.login} onLogout={() => void logout()} onRefresh={session.activeRole === 'STUDENT' ? () => setRefreshSignal((current) => current + 1) : undefined} />
  if (session.activeRole === 'TEACHER') return <>{navigation}<main><section className="teacher-panel"><h1>Vítejte, {session.firstName}</h1><p>Pedagogická část bude navazovat tvorbou termínů.</p></section></main></>
  return <div className="app-shell">{navigation}{toast && <div className={`toast ${toast.type}`}>{toast.type === 'success' && '✓ '}{toast.message}</div>}<BookingPage session={session} onToast={setToast} refreshSignal={refreshSignal} /></div>
}
