import logo from '../assets/vsb-logo.png'
import type { UserRole } from '../types/api'

interface NavigationProps {
  activeRole: UserRole
  userLogin: string
  onLogout: () => void
  onRefresh?: () => void
}

function RefreshIcon() { return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 12a8 8 0 1 1-2.34-5.66M20 4v6h-6" /></svg> }
function LogoutIcon() { return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 17l5-5-5-5M15 12H3M14 4h5v16h-5" /></svg> }

export default function Navigation({ activeRole, userLogin, onLogout, onRefresh }: NavigationProps) {
  const roleLabel = activeRole === 'STUDENT' ? 'Student' : 'Pedagog'
  return <header className="site-navigation"><div className="navigation-content">
    <div className="brand"><img src={logo} alt="VŠB Technical University of Ostrava" /><span className="navigation-label">Rezervace konzultací</span></div>
    <div className="navigation-actions"><span className="user-role">{roleLabel}: <b>{userLogin}</b></span>{onRefresh && <button className="icon-button refresh-button" type="button" onClick={onRefresh} aria-label="Obnovit termíny" title="Obnovit termíny"><RefreshIcon /></button>}<button className="icon-button logout-button" type="button" onClick={onLogout} aria-label="Odhlásit se" title="Odhlásit se"><LogoutIcon /></button></div>
  </div></header>
}
