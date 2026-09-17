import { useState, type FormEvent } from 'react'
import logo from '../../assets/vsb-logo.png'
import { api } from '../../api/client'
import type { Session, UserRole } from '../../types/api'
import type { TFunction } from '../../i18n'

interface LoginProps {
  role: UserRole
  onLogin: (session: Session) => void
  t: TFunction
}

export default function Login({ role, onLogin, t }: LoginProps) {
  const [login, setLogin] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    if (login.length > 7) {
      setError(t('loginTooLong'))
      return
    }
    try {
      onLogin(await api.login(login, password, role))
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : t('loginFailed'))
    }
  }
  return (
    <main className="login-page">
      <section className="login-card">
        <img src={logo} alt="VŠB Technical University of Ostrava" className="mb-8 h-36 w-auto" />
        <p>{t('landingEyebrow')}</p>
        <h1>
          {t('loginTitle')} —{' '}
          {role === 'STUDENT' ? t('student').toLocaleLowerCase() : t('teacher').toLocaleLowerCase()}
        </h1>
        <form onSubmit={submit}>
          <label htmlFor="login">{t('login')}</label>
          <input
            id="login"
            required
            maxLength={7}
            pattern="[A-Za-z]{3}[0-9]{4}"
            value={login}
            onChange={(event) => setLogin(event.target.value)}
            placeholder="BLO0021"
          />
          <label htmlFor="password">{t('password')}</label>
          <input
            id="password"
            required
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
          <button className="reserve-button">{t('signIn')}</button>
          {error && <span className="login-error">{error}</span>}
        </form>
      </section>
    </main>
  )
}
