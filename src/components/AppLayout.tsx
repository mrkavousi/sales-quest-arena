import type { ReactNode } from 'react';
import { useLanguage } from '../i18n/LanguageContext';
import type { MessageKey } from '../i18n/messages';
import type { RouteName } from '../router';
import { useGame } from '../state/GameContext';
import { Icon, type IconName } from './ui/Icon';

const TABS: { route: RouteName; href: string; label: MessageKey; icon: IconName }[] = [
  { route: 'arena', href: '#/', label: 'nav.arena', icon: 'shield' },
  { route: 'missions', href: '#/missions', label: 'nav.missions', icon: 'target' },
  { route: 'history', href: '#/history', label: 'nav.history', icon: 'scroll' },
  { route: 'profile', href: '#/profile', label: 'nav.profile', icon: 'user' },
];

export function Logo() {
  const { t } = useLanguage();
  return (
    <span className="logo">
      <svg width="40" height="40" viewBox="0 0 64 64" aria-hidden="true">
        <rect width="64" height="64" rx="18" fill="#ffc93c" />
        <rect y="-4" width="64" height="64" rx="18" fill="#ffd95e" />
        <path d="M32 8l6.6 13.4 14.8 2.2-10.7 10.4 2.5 14.7L32 41.8l-13.2 6.9 2.5-14.7L10.6 23.6l14.8-2.2z" fill="#5b3df5" />
      </svg>
      <span className="logo__text">
        <b>{t('logo.name')}</b>
        <i>{t('logo.arena')}</i>
      </span>
    </span>
  );
}

export function StorageBanner() {
  const { mode, account, persistence, contractError, refresh, changeAccount } = useGame();
  const { t } = useLanguage();
  const hasError = persistence === 'error' || contractError !== null;
  if (mode === 'server') return (
    <div className={`connection-banner${hasError ? ' is-error' : ''}`} role={hasError ? 'alert' : 'status'}>
      <div><b>{t('connection.serverBadge')}</b> · <bdi>{account?.account_name}</bdi></div>
      <span>{contractError ? <>{t(contractError === 'UNSUPPORTED_VERSION' ? 'connection.errorVersion' : 'connection.errorResponse')} {t('connection.compatibilityPaused')}</> : t(persistence === 'saving' ? 'connection.saving' : persistence === 'saved' ? 'connection.saved' : 'connection.notSaved')}</span>
      {hasError && <div className="connection-banner__actions"><button className="linkbtn" onClick={() => void refresh()}>{t('connection.retry')}</button><button className="linkbtn" onClick={changeAccount}>{t('connection.switchAccount')}</button></div>}
    </div>
  );
  return (
    <>
      <div className="connection-banner connection-banner--local"><b>{t('connection.localBadge')}</b></div>
      {persistence !== 'saved' && <div className="storage-banner" role="alert"><b>{t('storage.warning')}</b>{' '}{t(persistence === 'unavailable' ? 'storage.unavailable' : 'storage.error')}</div>}
    </>
  );
}

export function AppLayout({ route, children }: { route: RouteName; children: ReactNode }) {
  const { language, setLanguage, t } = useLanguage();
  const nextLanguage = language === 'en' ? 'fa' : 'en';
  return (
    <div className="shell">
      <nav className="nav" aria-label={t('nav.main')}>
        <div className="nav__brand">
          <Logo />
        </div>
        <div className="nav__tabs">
          {TABS.map((tab) => (
            <a key={tab.route} href={tab.href} className={`nav__tab${route === tab.route ? ' is-active' : ''}`} aria-current={route === tab.route ? 'page' : undefined}>
              <span className="nav__icon">
                <Icon name={tab.icon} size={24} />
              </span>
              <span className="nav__label">{t(tab.label)}</span>
            </a>
          ))}
          <button
            type="button"
            className="nav__tab nav__language"
            onClick={() => setLanguage(nextLanguage)}
            aria-label={t(nextLanguage === 'fa' ? 'language.switchToFa' : 'language.switchToEn')}
          >
            <span className="nav__icon"><Icon name="globe" size={24} /></span>
            <span className="nav__label" lang={nextLanguage} dir={nextLanguage === 'fa' ? 'rtl' : 'ltr'}>
              {nextLanguage === 'fa' ? 'فارسی' : 'English'}
            </span>
          </button>
        </div>
      </nav>
      <main className="shell__main">
        <StorageBanner />
        <div className="page" key={route}>
          {children}
        </div>
      </main>
    </div>
  );
}

export function ToastHost() {
  const { toasts } = useGame();
  return (
    <div className="toasts" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={`toast toast--${t.tone}`}>
          {t.text}
        </div>
      ))}
    </div>
  );
}
