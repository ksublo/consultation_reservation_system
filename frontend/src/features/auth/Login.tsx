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
  const [mode, setMode] = useState<'passkey' | 'password' | 'setup'>('password')
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
      const session =
        mode === 'setup'
          ? await api.registerPasskey(login, password, role)
          : mode === 'password'
            ? await api.loginWithPassword(login, password, role)
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
          <div className="labeled-field login-field">
            <label htmlFor="login">{t('login')}</label>
            <input
              id="login"
              required
              maxLength={7}
              pattern="[A-Za-z]{3}[0-9]{4}"
              autoComplete="username webauthn"
              value={login}
              onChange={(event) => setLogin(event.target.value)}
              placeholder="ABC0001"
            />
          </div>
          {mode !== 'passkey' && (
            <div className="labeled-field login-field">
              <label htmlFor="password">{t('passwordForPasskeySetup')}</label>
              <input
                id="password"
                required
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </div>
          )}
          <button className="reserve-button" disabled={busy}>
            {busy
              ? t('pleaseWait')
              : mode === 'setup'
                ? t('createPasskey')
                : mode === 'password'
                  ? t('signIn')
                  : t('signInWithPasskey')}
          </button>
          <button
            className="passkey-setup-link"
            type="button"
            disabled={busy}
            onClick={() => {
              setError('')
              setPassword('')
              setMode((current) => (current === 'passkey' ? 'password' : 'passkey'))
            }}
          >
            {mode === 'password' ? t('signInWithPasskey') : t('signInWithPassword')}
          </button>
          {mode !== 'password' && (
            <button
              className="passkey-setup-link"
              type="button"
              disabled={busy}
              onClick={() => {
                setError('')
                setPassword('')
                setMode((current) => (current === 'setup' ? 'passkey' : 'setup'))
              }}
            >
              {mode === 'setup' ? t('cancelPasskeySetup') : t('setUpPasskey')}
            </button>
          )}
          {mode === 'setup' && <p className="login-hint">{t('passkeySetupHint')}</p>}
          {error && <span className="login-error">{error}</span>}
        </form>
      </section>
    </main>
  )
}
