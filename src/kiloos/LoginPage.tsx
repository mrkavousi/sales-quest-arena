import { useEffect, useState } from 'react';
import { api } from '../api/client';
import type { DemoUser } from '../api/types';
import { Logo } from '../components/AppLayout';
import { LanguageSwitcher } from '../components/LanguageSwitcher';
import { useLanguage } from '../i18n/LanguageContext';
import type { MessageKey } from '../i18n/messages';
import { useSession } from '../state/SessionContext';
import { DemoBanner } from './ui';

interface DemoUsers {
  notice: string;
  users: DemoUser[];
}

const SECTIONS: { title: MessageKey; hint: MessageKey; match: (u: DemoUser) => boolean }[] = [
  { title: 'k.login.secAdmin', hint: 'k.login.secAdminHint', match: (u) => u.position === 'admin' },
  { title: 'k.login.secMgmt', hint: 'k.login.secMgmtHint', match: (u) => u.position === 'management' },
  { title: 'k.login.secBranch', hint: 'k.login.secBranchHint', match: (u) => u.position === 'branch_manager' },
  { title: 'k.login.secSup', hint: 'k.login.secSupHint', match: (u) => u.position === 'supervisor' },
  { title: 'k.login.secRep', hint: 'k.login.secRepHint', match: (u) => u.position === 'rep' },
];

/** Demo account picker. Real login (SSO/OTP) is explicitly out of scope for the demo. */
export function LoginPage({ expired }: { expired?: boolean }) {
  const { login } = useSession();
  const { t } = useLanguage();
  const [data, setData] = useState<DemoUsers | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<DemoUsers>('/api/v1/auth/demo-users', { quiet401: true })
      .then(setData)
      .catch((err: Error) => setError(err.message));
  }, []);

  const pick = async (user: DemoUser) => {
    setBusy(user.id);
    setError(null);
    try {
      await login(user.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('k.signInFailed'));
      setBusy(null);
    }
  };

  return (
    <div className="k-login">
      <div className="k-login__card">
        <div className="k-login__top">
          <Logo />
          <LanguageSwitcher />
        </div>
        <h1>{t('k.login.title')}</h1>
        <p className="k-muted">{t('k.login.intro')}</p>
        <DemoBanner notice={data?.notice} />
        {expired && (
          <div className="k-state k-state--error" role="alert">
            <p>{t('k.login.expired')}</p>
          </div>
        )}
        {error && (
          <div className="k-state k-state--error" role="alert">
            <p>{error}</p>
          </div>
        )}
        {!data && !error && (
          <div className="k-state" role="status">
            <span className="boot__spinner" aria-hidden="true" />
          </div>
        )}
        {data &&
          SECTIONS.map((section) => {
            const users = data.users.filter(section.match);
            if (users.length === 0) return null;
            return (
              <section key={section.title} className="k-login__group">
                <h2>
                  {t(section.title)} <small>{t(section.hint)}</small>
                </h2>
                <div className="k-login__list">
                  {users.map((user) => (
                    <button key={user.id} className="k-login__user" onClick={() => void pick(user)} disabled={busy !== null} data-testid={`login-${user.employee_code ?? user.position}`}>
                      <b dir="auto">{user.name}</b>
                      <span>
                        {user.title}
                        {user.branch_name ? ` · ${user.branch_name}` : ''}
                      </span>
                      {user.employee_code && <em>{user.employee_code}</em>}
                      {busy === user.id && <i className="k-login__busy">{t('k.login.signingIn')}</i>}
                    </button>
                  ))}
                </div>
              </section>
            );
          })}
      </div>
    </div>
  );
}
