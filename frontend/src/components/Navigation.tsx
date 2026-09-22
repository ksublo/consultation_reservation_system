import { useEffect, useRef, useState } from 'react'
import logo from '../assets/vsb-logo.png'
import type { Language, TFunction } from '../i18n'
import type { UserRole } from '../types/api'

type TeacherView = 'slots' | 'requests'
type StudentView = 'booking' | 'reservations'

interface NavigationProps {
  activeRole?: UserRole
  userLogin?: string
  onLogout?: () => void
  onRefresh?: () => void
  teacherView?: TeacherView
  onTeacherViewChange?: (view: TeacherView) => void
  studentView?: StudentView
  onStudentViewChange?: (view: StudentView) => void
  language: Language
  onLanguageChange: (language: Language) => void
  t: TFunction
}

function RefreshIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M20 12a8 8 0 1 1-2.34-5.66M20 4v6h-6" />
    </svg>
  )
}

function LogoutIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M10 17l5-5-5-5M15 12H3M14 4h5v16h-5" />
    </svg>
  )
}

function MenuIcon() {
  return (
    <span className="hamburger-icon" aria-hidden="true">
      <span />
      <span />
      <span />
    </span>
  )
}

export default function Navigation({
  activeRole,
  userLogin,
  onLogout,
  onRefresh,
  teacherView,
  onTeacherViewChange,
  studentView,
  onStudentViewChange,
  language,
  onLanguageChange,
  t,
}: NavigationProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const hasSession = Boolean(activeRole && userLogin)
  const roleLabel = activeRole === 'STUDENT' ? t('student') : t('teacher')

  useEffect(() => {
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') setMenuOpen(false)
    }

    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [])

  function closeMenu() {
    setMenuOpen(false)
  }

  function selectStudentView(view: StudentView) {
    onStudentViewChange?.(view)
    closeMenu()
  }

  function selectTeacherView(view: TeacherView) {
    onTeacherViewChange?.(view)
    closeMenu()
  }

  function changeLanguage(nextLanguage: Language) {
    onLanguageChange(nextLanguage)
    closeMenu()
  }

  function renderNavigation(className: string) {
    if (activeRole === 'STUDENT') {
      return (
        <nav className={className} aria-label={t('appTitle')}>
          <button
            className={studentView === 'booking' ? 'active' : ''}
            type="button"
            onClick={() => selectStudentView('booking')}
          >
            {t('booking')}
          </button>
          <button
            className={studentView === 'reservations' ? 'active' : ''}
            type="button"
            onClick={() => selectStudentView('reservations')}
          >
            {t('myReservations')}
          </button>
        </nav>
      )
    }

    if (activeRole === 'TEACHER') {
      return (
        <nav className={className} aria-label={t('appTitle')}>
          <button
            className={teacherView === 'slots' ? 'active' : ''}
            type="button"
            onClick={() => selectTeacherView('slots')}
          >
            {t('slots')}
          </button>
          <button
            className={teacherView === 'requests' ? 'active' : ''}
            type="button"
            onClick={() => selectTeacherView('requests')}
          >
            {t('requests')}
          </button>
        </nav>
      )
    }

    return null
  }

  return (
    <header className="site-navigation">
      <div className="navigation-content">
        <div className="brand">
          <img src={logo} alt="VŠB Technical University of Ostrava" />
          <span className="navigation-label">{t('appTitle')}</span>
        </div>

        {renderNavigation('primary-navigation')}
        <div className="navigation-actions">
          {hasSession && (
            <span className="user-role">
              {roleLabel}: <b>{userLogin}</b>
            </span>
          )}
          <div className="desktop-controls">
            <div className="language-switch" aria-label={t('language')}>
              <button
                className={language === 'cs' ? 'active' : ''}
                type="button"
                aria-label="Čeština"
                onClick={() => onLanguageChange('cs')}
              >
                CS
              </button>
              <button
                className={language === 'en' ? 'active' : ''}
                type="button"
                aria-label="English"
                onClick={() => onLanguageChange('en')}
              >
                EN
              </button>
            </div>
            {onRefresh && (
              <button
                className="icon-button refresh-button"
                type="button"
                aria-label={t('refreshSlots')}
                onClick={onRefresh}
              >
                <RefreshIcon />
              </button>
            )}
            {onLogout && (
              <button
                className="icon-button logout-button"
                type="button"
                aria-label={hasSession ? t('logout') : t('back')}
                onClick={onLogout}
              >
                <LogoutIcon />
              </button>
            )}
          </div>
          <button
            className={`menu-toggle ${menuOpen ? 'open' : ''}`}
            type="button"
            aria-label={menuOpen ? t('closeMenu') : t('openMenu')}
            aria-expanded={menuOpen}
            aria-controls="account-menu"
            onClick={() => setMenuOpen((open) => !open)}
          >
            <MenuIcon />
          </button>
        </div>

        {menuOpen && (
          <>
            <button
              className="navigation-menu-backdrop"
              type="button"
              aria-label={t('closeMenu')}
              onClick={closeMenu}
            />
            <div id="account-menu" ref={menuRef} className="navigation-menu" role="dialog">
              {hasSession && (
                <div className="menu-account">
                  <span>{roleLabel}</span>
                  <strong>{userLogin}</strong>
                </div>
              )}

              {renderNavigation('menu-navigation')}

              <div className="menu-controls">
                <div className="language-switch" aria-label={t('language')}>
                  <button
                    className={language === 'cs' ? 'active' : ''}
                    type="button"
                    aria-label="Čeština"
                    onClick={() => changeLanguage('cs')}
                  >
                    CS
                  </button>
                  <button
                    className={language === 'en' ? 'active' : ''}
                    type="button"
                    aria-label="English"
                    onClick={() => changeLanguage('en')}
                  >
                    EN
                  </button>
                </div>

                {(onRefresh || onLogout) && (
                  <div className="menu-icon-actions">
                    {onRefresh && (
                      <button
                        className="menu-icon-action"
                        type="button"
                        aria-label={t('refreshSlots')}
                        onClick={() => {
                          onRefresh()
                          closeMenu()
                        }}
                      >
                        <RefreshIcon />
                      </button>
                    )}
                    {onLogout && (
                      <button
                        className="menu-icon-action danger"
                        type="button"
                        aria-label={hasSession ? t('logout') : t('back')}
                        onClick={onLogout}
                      >
                        <LogoutIcon />
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </header>
  )
}
