import { useEffect, useState } from 'react'
import { api } from './api/client'
import ErrorBoundary from './components/ErrorBoundary'
import ErrorPage from './components/ErrorPage'
import Navigation from './components/Navigation'
import Login from './features/auth/Login'
import BookingPage from './features/booking/BookingPage'
import MyReservationsPage from './features/booking/MyReservationsPage'
import TeacherPage from './features/teacher/TeacherPage'
import type { Notification, Session, UserRole } from './types/api'
import { createTranslator, type Language } from './i18n'
import './index.css'

function storedSession(): Session | null {
  const stored = sessionStorage.getItem('session')
  if (!stored) return null
  try {
    return JSON.parse(stored) as Session
  } catch {
    sessionStorage.removeItem('session')
    return null
  }
}

function storedLanguage(): Language {
  return sessionStorage.getItem('language') === 'en' ? 'en' : 'cs'
}

export default function App() {
  const [session, setSession] = useState<Session | null>(storedSession)
  const [language, setLanguageState] = useState<Language>(storedLanguage)
  const [online, setOnline] = useState(() => navigator.onLine)
  const [loginRole, setLoginRole] = useState<UserRole | null>(null)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [refreshSignal, setRefreshSignal] = useState(0)
  const [teacherView, setTeacherView] = useState<'slots' | 'requests'>('slots')
  const [studentView, setStudentView] = useState<'booking' | 'reservations'>('booking')
  const t = createTranslator(language)
  useEffect(() => {
    api.setLanguage(language)
    document.documentElement.lang = language
  }, [language])
  useEffect(() => {
    const updateOnline = () => setOnline(navigator.onLine)
    window.addEventListener('online', updateOnline)
    window.addEventListener('offline', updateOnline)
    return () => {
      window.removeEventListener('online', updateOnline)
      window.removeEventListener('offline', updateOnline)
    }
  }, [])
  async function loadNotifications(currentSession = session) {
    if (!currentSession) return
    try {
      setNotifications(await api.getNotifications(currentSession.token, currentSession.userId))
    } catch {
      setNotifications([])
    }
  }
  useEffect(() => {
    void loadNotifications()
    const interval = window.setInterval(() => void loadNotifications(), 30000)
    return () => window.clearInterval(interval)
  }, [session])
  function refreshNotifications() {
    void loadNotifications()
  }
  async function markNotificationRead(notificationId: string) {
    if (!session) return
    await api
      .markNotificationRead(session.token, session.userId, notificationId)
      .catch(() => undefined)
    setNotifications((items) => items.filter((item) => item.id !== notificationId))
  }
  function setLanguage(nextLanguage: Language) {
    sessionStorage.setItem('language', nextLanguage)
    setLanguageState(nextLanguage)
  }
  function signIn(newSession: Session) {
    sessionStorage.setItem('session', JSON.stringify(newSession))
    setSession(newSession)
  }
  async function logout() {
    if (session) await api.logout(session.token).catch(() => undefined)
    sessionStorage.removeItem('session')
    setSession(null)
    setLoginRole(null)
  }
  if (!online)
    return (
      <ErrorPage
        language={language}
        onLanguageChange={setLanguage}
        onRetry={() => setOnline(navigator.onLine)}
        reason="offline"
        t={t}
      />
    )
  if (!session && !loginRole)
    return (
      <ErrorBoundary language={language} onLanguageChange={setLanguage} t={t}>
        <div className="app-shell">
          <Navigation language={language} onLanguageChange={setLanguage} t={t} />
          <main className="login-page">
            <section className="login-card">
              <p>{t('landingEyebrow')}</p>
              <h1>{t('landingTitle')}</h1>
              <div className="role-buttons">
                <button type="button" onClick={() => setLoginRole('STUDENT')}>
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7 8c0-3.3 3.1-6 7-6s7 2.7 7 6" />
                  </svg>
                  <span>{t('studentRoleButton')}</span>
                </button>
                <button type="button" onClick={() => setLoginRole('TEACHER')}>
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="m4 10 8-5 8 5-8 5-8-5Zm3 3v4c0 1.5 2.2 3 5 3s5-1.5 5-3v-4" />
                  </svg>
                  <span>{t('teacherRoleButton')}</span>
                </button>
              </div>
            </section>
          </main>
        </div>
      </ErrorBoundary>
    )
  if (!session && loginRole)
    return (
      <ErrorBoundary language={language} onLanguageChange={setLanguage} t={t}>
        <div className="app-shell">
          <Navigation
            language={language}
            onLanguageChange={setLanguage}
            onLogout={() => setLoginRole(null)}
            t={t}
          />
          <Login role={loginRole} onLogin={signIn} t={t} />
        </div>
      </ErrorBoundary>
    )
  if (!session) return null
  const navigation = (
    <Navigation
      activeRole={session.activeRole}
      userLogin={session.login}
      onLogout={() => void logout()}
      onRefresh={
        session.activeRole === 'STUDENT'
          ? () => setRefreshSignal((current) => current + 1)
          : undefined
      }
      teacherView={teacherView}
      onTeacherViewChange={setTeacherView}
      studentView={studentView}
      onStudentViewChange={setStudentView}
      language={language}
      onLanguageChange={setLanguage}
      notifications={notifications}
      onNotificationRead={(notificationId) => void markNotificationRead(notificationId)}
      t={t}
    />
  )
  if (session.activeRole === 'TEACHER')
    return (
      <ErrorBoundary language={language} onLanguageChange={setLanguage} t={t}>
        <div className="app-shell">
          {navigation}
          <TeacherPage
            session={session}
            onToast={refreshNotifications}
            view={teacherView}
            language={language}
            t={t}
          />
        </div>
      </ErrorBoundary>
    )
  return (
    <ErrorBoundary language={language} onLanguageChange={setLanguage} t={t}>
      <div className="app-shell">
        {navigation}
        {studentView === 'booking' ? (
          <BookingPage
            session={session}
            onToast={refreshNotifications}
            refreshSignal={refreshSignal}
            language={language}
            t={t}
          />
        ) : (
          <MyReservationsPage
            session={session}
            onToast={refreshNotifications}
            refreshSignal={refreshSignal}
            language={language}
            t={t}
          />
        )}
      </div>
    </ErrorBoundary>
  )
}
