import type { Language, TFunction } from '../i18n'

interface ErrorPageProps {
  language: Language
  onLanguageChange: (language: Language) => void
  onRetry?: () => void
  reason: 'offline' | 'error'
  t: TFunction
}

export default function ErrorPage({ language, onLanguageChange, onRetry, reason, t }: ErrorPageProps) {
  return <main className="error-page"><section className="error-panel" role="alert" aria-live="assertive"><div className="language-switch" aria-label={t('language')}><button className={language === 'cs' ? 'active' : ''} type="button" onClick={() => onLanguageChange('cs')}>CS</button><button className={language === 'en' ? 'active' : ''} type="button" onClick={() => onLanguageChange('en')}>EN</button></div><div className="error-mark" aria-hidden="true">{reason === 'offline' ? '!' : '×'}</div><p className="label">{reason === 'offline' ? t('offlineEyebrow') : t('errorEyebrow')}</p><h1>{reason === 'offline' ? t('offlineTitle') : t('errorTitle')}</h1><p className="muted">{reason === 'offline' ? t('offlineMessage') : t('errorMessage')}</p><div className="error-actions"><button className="reserve-button" type="button" onClick={onRetry ?? (() => window.location.reload())}>{t('tryAgain')}</button></div></section></main>
}
