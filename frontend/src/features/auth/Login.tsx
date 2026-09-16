import { useState, type FormEvent } from 'react'
import logo from '../../assets/vsb-logo.png'
import { api } from '../../api/client'
import type { Session, UserRole } from '../../types/api'

interface LoginProps { role: UserRole; onLogin: (session: Session) => void; onBack: () => void }

export default function Login({ role, onLogin, onBack }: LoginProps) {
  const [login, setLogin] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError('')
    try { onLogin(await api.login(login, password, role)) } catch (requestError) { setError(requestError instanceof Error ? requestError.message : 'Přihlášení se nepodařilo.') }
  }
  return <main className="login-page"><button className="back" type="button" onClick={onBack}>← Zpět</button><section className="login-card"><img src={logo} alt="VŠB Technical University of Ostrava" className="mb-8 h-36 w-auto" /><p>REZERVACE KONZULTACÍ</p><h1>Přihlášení — {role === 'STUDENT' ? 'student' : 'pedagog'}</h1><form onSubmit={submit}><label htmlFor="login">Login</label><input id="login" required pattern="[A-Za-z]{3}[0-9]{4}" value={login} onChange={(event) => setLogin(event.target.value)} placeholder="BLO0021" /><label htmlFor="password">Heslo</label><input id="password" required type="password" value={password} onChange={(event) => setPassword(event.target.value)} /><button className="reserve-button">Přihlásit se</button>{error && <span className="login-error">{error}</span>}</form></section></main>
}
