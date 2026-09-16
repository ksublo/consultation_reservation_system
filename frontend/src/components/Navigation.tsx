import logo from '../assets/vsb-logo.png'
import type { UserRole } from '../types/api'

interface NavigationProps {
  activeRole: UserRole
  onLogout: () => void
}

const navigationItems = ['Přehled', 'Pedagogové', 'Dostupné termíny', 'Moje rezervace']

export default function Navigation({ activeRole, onLogout }: NavigationProps) {
  return <header className="site-navigation">
    <div className="brand"><img src={logo} alt="VŠB Technical University of Ostrava" /><strong>Rezervace konzultací</strong></div>
    <nav aria-label="Hlavní navigace">{navigationItems.map((item) => <button key={item} type="button" disabled>{item}</button>)}</nav>
    <div className="navigation-actions"><span>{activeRole === 'STUDENT' ? 'Student' : 'Pedagog'}</span><button className="logout-button" type="button" onClick={onLogout}>Odhlásit se</button></div>
  </header>
}
