import logo from '../assets/vsb-logo.png'
import type { UserRole } from '../types/api'
import type { Language, TFunction } from '../i18n'
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
  const roleLabel = activeRole === 'STUDENT' ? t('student') : t('teacher')
  return (
    <header className="site-navigation">
      <div className="navigation-content">
        <div className="brand">
          <img src={logo} alt="VŠB Technical University of Ostrava" />
          <span className="navigation-label">{t('appTitle')}</span>
        </div>
        {activeRole === 'STUDENT' && (
          <nav className="teacher-nav">
            <button
              className={studentView === 'booking' ? 'active' : ''}
              onClick={() => onStudentViewChange?.('booking')}
            >
              {t('booking')}
            </button>
            <button
              className={studentView === 'reservations' ? 'active' : ''}
              onClick={() => onStudentViewChange?.('reservations')}
            >
              {t('myReservations')}
            </button>
          </nav>
        )}
        {activeRole === 'TEACHER' && (
          <nav className="teacher-nav">
            <button
              className={teacherView === 'slots' ? 'active' : ''}
              onClick={() => onTeacherViewChange?.('slots')}
            >
              {t('slots')}
            </button>
            <button
              className={teacherView === 'requests' ? 'active' : ''}
              onClick={() => onTeacherViewChange?.('requests')}
            >
              {t('requests')}
            </button>
          </nav>
        )}
        <div className="navigation-actions">
          <div className="language-switch" aria-label={t('language')}>
            <button
              className={language === 'cs' ? 'active' : ''}
              type="button"
              onClick={() => onLanguageChange('cs')}
            >
              CS
            </button>
            <button
              className={language === 'en' ? 'active' : ''}
              type="button"
              onClick={() => onLanguageChange('en')}
            >
              EN
            </button>
          </div>
          {activeRole && userLogin && (
            <span className="user-role">
              {roleLabel}: <b>{userLogin}</b>
            </span>
          )}
          {onRefresh && (
            <button
              className="icon-button refresh-button"
              onClick={onRefresh}
              aria-label={t('refreshSlots')}
            >
              <RefreshIcon />
            </button>
          )}
          {onLogout && (
            <button
              className="icon-button logout-button"
              onClick={onLogout}
              aria-label={t('logout')}
            >
              <LogoutIcon />
            </button>
          )}
        </div>
      </div>
    </header>
  )
}
