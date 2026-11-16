import { useEffect, useState } from 'react';
import { api } from '../api/client';
import type { DemoUser } from '../api/types';
import { Logo } from '../components/AppLayout';
import { useSession } from '../state/SessionContext';
import { DemoBanner } from './ui';

interface DemoUsers {
  notice: string;
  users: DemoUser[];
}

const SECTIONS: { title: string; hint: string; match: (u: DemoUser) => boolean }[] = [
  { title: 'Administrator', hint: 'Imports the Excel workbook and sees everything', match: (u) => u.position === 'admin' },
  { title: 'Management', hint: 'Organization-wide dashboards', match: (u) => u.position === 'management' },
  { title: 'Branch managers', hint: 'Their branch only', match: (u) => u.position === 'branch_manager' },
  { title: 'Supervisors', hint: 'Their own team only', match: (u) => u.position === 'supervisor' },
  { title: 'Sales representatives', hint: 'Employee dashboard and Sales Quest Arena', match: (u) => u.position === 'rep' },
];

/** Demo account picker. Real login (SSO/OTP) is explicitly out of scope for the demo. */
export function LoginPage({ expired }: { expired?: boolean }) {
  const { login } = useSession();
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
      setError(err instanceof Error ? err.message : 'Sign-in failed.');
      setBusy(null);
    }
  };

  return (
    <div className="k-login">
      <div className="k-login__card">
        <Logo />
        <h1>Kiloos demo</h1>
        <p className="k-muted">Pick a demo account. This is the live management demonstration — sign in as different roles to see what each one sees.</p>
        <DemoBanner notice={data?.notice} />
        {expired && (
          <div className="k-state k-state--error" role="alert">
            <p>Your session expired. Please sign in again.</p>
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
                  {section.title} <small>{section.hint}</small>
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
                      {busy === user.id && <i className="k-login__busy">Signing in…</i>}
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
