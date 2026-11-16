import type { ReactNode } from 'react';
import { useLanguage } from '../i18n/LanguageContext';
import type { MessageKey } from '../i18n/messages';
import type { RouteName } from '../router';
import { useGame } from '../state/GameContext';
import { useOptionalSession } from '../state/SessionContext';
import { LanguageSwitcher } from './LanguageSwitcher';
import { Icon, type IconName } from './ui/Icon';

interface TabDef {
  route: RouteName;
  href: string;
  label: MessageKey;
  icon: IconName;
}

const TABS: TabDef[] = [
  { route: 'arena', href: '#/', label: 'nav.arena', icon: 'shield' },
  { route: 'missions', href: '#/missions', label: 'nav.missions', icon: 'target' },
  { route: 'history', href: '#/history', label: 'nav.history', icon: 'scroll' },
  { route: 'profile', href: '#/profile', label: 'nav.profile', icon: 'user' },
];

/** Server-mode tabs: the representative also gets the performance dashboard and the leaderboard. */
const SERVER_TABS: TabDef[] = [
  { route: 'arena', href: '#/', label: 'nav.arena', icon: 'shield' },
  { route: 'missions', href: '#/missions', label: 'nav.missions', icon: 'target' },
  { route: 'me', href: '#/me', label: 'k.g.navSales', icon: 'box' },
  { route: 'board', href: '#/board', label: 'k.g.navRanking', icon: 'trophy' },
  { route: 'history', href: '#/history', label: 'nav.history', icon: 'scroll' },
  { route: 'profile', href: '#/profile', label: 'nav.profile', icon: 'user' },
];

export function Logo() {
  return (
    <span className="logo">
      <svg width="40" height="40" viewBox="0 0 64 64" aria-hidden="true">
        <rect width="64" height="64" rx="18" fill="#ffc93c" />
        <rect y="-4" width="64" height="64" rx="18" fill="#ffd95e" />
        <path d="M32 8l6.6 13.4 14.8 2.2-10.7 10.4 2.5 14.7L32 41.8l-13.2 6.9 2.5-14.7L10.6 23.6l14.8-2.2z" fill="#5b3df5" />
      </svg>
      <span className="logo__text">
        <b>Sales Quest</b>
        <i>Arena</i>
      </span>
    </span>
  );
}

export function StorageBanner() {
  const { persistence } = useGame();
  const { t } = useLanguage();
  if (persistence === 'saved') return null;
  return (
    <div className="storage-banner" role="alert">
      <b>{t('storage.warning')}</b>{' '}
      {persistence === 'unavailable' ? t('storage.unavailable') : t('storage.error')}
    </div>
  );
}

export function AppLayout({ route, children }: { route: RouteName; children: ReactNode }) {
  const { mode } = useGame();
  const session = useOptionalSession();
  const { t } = useLanguage();
  const tabs = mode === 'server' ? SERVER_TABS : TABS;
  return (
    <div className="shell">
      <nav className="nav" aria-label={t('nav.main')}>
        <div className="nav__brand">
          <Logo />
          <LanguageSwitcher />
        </div>
        <div className="nav__tabs" style={mode === 'server' ? { gridTemplateColumns: 'repeat(6, 1fr)' } : undefined}>
          {tabs.map((tab) => (
            <a key={tab.route} href={tab.href} className={`nav__tab${route === tab.route ? ' is-active' : ''}`} aria-current={route === tab.route ? 'page' : undefined}>
              <span className="nav__icon">
                <Icon name={tab.icon} size={24} />
              </span>
              <span className="nav__label">{t(tab.label)}</span>
            </a>
          ))}
        </div>
        {mode === 'server' && session?.user && (
          <div className="nav__session">
            <span dir="auto">{session.user.name}</span>
            <small>{session.user.employee_code} · {t('k.demoBadge')}</small>
            <button className="linkbtn" onClick={() => void session.logout()}>
              {t('k.signOut')}
            </button>
          </div>
        )}
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
