import type { ReactNode } from 'react';
import type { RouteName } from '../router';
import { useGame } from '../state/GameContext';
import { useOptionalSession } from '../state/SessionContext';
import { Icon, type IconName } from './ui/Icon';

const TABS: { route: RouteName; href: string; label: string; icon: IconName }[] = [
  { route: 'arena', href: '#/', label: 'Arena', icon: 'shield' },
  { route: 'missions', href: '#/missions', label: 'Missions', icon: 'target' },
  { route: 'history', href: '#/history', label: 'History', icon: 'scroll' },
  { route: 'profile', href: '#/profile', label: 'Profile', icon: 'user' },
];

/** Server-mode tabs: the representative also gets the performance dashboard and the leaderboard. */
const SERVER_TABS: { route: RouteName; href: string; label: string; icon: IconName }[] = [
  { route: 'arena', href: '#/', label: 'Arena', icon: 'shield' },
  { route: 'missions', href: '#/missions', label: 'Missions', icon: 'target' },
  { route: 'me', href: '#/me', label: 'Sales', icon: 'box' },
  { route: 'board', href: '#/board', label: 'Ranking', icon: 'trophy' },
  { route: 'history', href: '#/history', label: 'History', icon: 'scroll' },
  { route: 'profile', href: '#/profile', label: 'Profile', icon: 'user' },
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
  if (persistence === 'saved') return null;
  return (
    <div className="storage-banner" role="alert">
      <b>Progress is not being saved.</b>{' '}
      {persistence === 'unavailable'
        ? 'This browser (or embedded preview) blocks local storage, so your progress will be lost when the page closes. Open the game in a normal browser tab to keep it.'
        : 'The last save failed — device storage may be full. Your progress will be lost when the page closes.'}
    </div>
  );
}

export function AppLayout({ route, children }: { route: RouteName; children: ReactNode }) {
  const { mode } = useGame();
  const session = useOptionalSession();
  const tabs = mode === 'server' ? SERVER_TABS : TABS;
  return (
    <div className="shell">
      <nav className="nav" aria-label="Main">
        <div className="nav__brand">
          <Logo />
        </div>
        <div className="nav__tabs" style={mode === 'server' ? { gridTemplateColumns: 'repeat(6, 1fr)' } : undefined}>
          {tabs.map((tab) => (
            <a key={tab.route} href={tab.href} className={`nav__tab${route === tab.route ? ' is-active' : ''}`} aria-current={route === tab.route ? 'page' : undefined}>
              <span className="nav__icon">
                <Icon name={tab.icon} size={24} />
              </span>
              <span className="nav__label">{tab.label}</span>
            </a>
          ))}
        </div>
        {mode === 'server' && session?.user && (
          <div className="nav__session">
            <span dir="auto">{session.user.name}</span>
            <small>{session.user.employee_code} · DEMO</small>
            <button className="linkbtn" onClick={() => void session.logout()}>
              Sign out
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
