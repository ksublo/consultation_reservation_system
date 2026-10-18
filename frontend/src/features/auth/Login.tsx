import { useState, type FormEvent } from 'react'
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
  const [settingUpPasskey, setSettingUpPasskey] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    if (login.length > 7) {
      setError(t('loginTooLong'))
      return
    }
    setBusy(true)
    try {
      const session = settingUpPasskey
        ? await api.registerPasskey(login, password, role)
        : await api.loginWithPasskey(login, role)
      setPassword('')
      onLogin(session)
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : t('loginFailed')
      setError(
        message === 'Passkeys require a supported browser on HTTPS or localhost.'
          ? t('passkeyUnsupported')
          : message,
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="login-page">
      <section className="login-card">
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
            autoComplete="username webauthn"
            value={login}
            onChange={(event) => setLogin(event.target.value)}
            placeholder="BLO0021"
          />
          {settingUpPasskey && (
            <>
              <label htmlFor="password">{t('passwordForPasskeySetup')}</label>
              <input
                id="password"
                required
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
              <p className="login-hint">{t('passkeySetupHint')}</p>
            </>
          )}
          <button className="reserve-button" disabled={busy}>
            {busy
              ? t('pleaseWait')
              : settingUpPasskey
                ? t('createPasskey')
                : t('signInWithPasskey')}
          </button>
          <button
            className="secondary-button"
            type="button"
            disabled={busy}
            onClick={() => {
              setError('')
              setPassword('')
              setSettingUpPasskey((current) => !current)
            }}
          >
            {settingUpPasskey ? t('cancelPasskeySetup') : t('setUpPasskey')}
          </button>
          {error && <span className="login-error">{error}</span>}
        </form>
      </section>
    </main>
  )
}
