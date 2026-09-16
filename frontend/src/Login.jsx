import { useState } from 'react'
import logo from './assets/vsb-logo.png'

export default function Login({ role, onLogin, onBack }) {
  const [login, setLogin] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  async function submit(event) {
    event.preventDefault(); setError('')
    const response = await fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ login, password, role }) })
    const data = await response.json()
    if (!response.ok) return setError(data.message || 'Přihlášení se nepodařilo.')
    onLogin(data)
  }
  return <main className="login-page"><button className="back" onClick={onBack}>← Zpět</button><section className="login-card"><img src={logo} alt="VŠB Technical University of Ostrava" className="mb-8 h-36 w-auto" /><p>REZERVACE KONZULTACÍ</p><h1>Přihlášení — {role === 'STUDENT' ? 'student' : 'pedagog'}</h1><form onSubmit={submit}><label>Login</label><input required pattern="[A-Za-z]{3}[0-9]{4}" value={login} onChange={e => setLogin(e.target.value)} placeholder="BLO0021" /><label>Heslo</label><input required type="password" value={password} onChange={e => setPassword(e.target.value)} /><button className="reserve-button">Přihlásit se</button>{error && <span className="login-error">{error}</span>}</form></section></main>
}
