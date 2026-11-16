import { useEffect, useState } from 'react';
import { api } from '../api/client';
import type { DemoUser } from '../api/types';
import { Logo } from '../components/AppLayout';
import { POSITION_FA } from '../i18n';
import { useSession } from '../state/SessionContext';
import { DemoBanner } from './ui';

interface DemoUsers {
  notice: string;
  users: DemoUser[];
}

const ENTRIES: { title: string; hint: string; pick: (users: DemoUser[]) => DemoUser | undefined; testid: string }[] = [
  { title: 'مدیر کل', hint: 'داشبورد سازمان، ورود اطلاعات و مدیریت مأموریت‌ها', pick: (u) => u.find((x) => x.position === 'admin'), testid: 'login-gm' },
  { title: 'مدیر شعبه', hint: 'عملکرد شعبه و تیم‌های آن', pick: (u) => u.find((x) => x.position === 'branch_manager'), testid: 'login-branch' },
  { title: 'سرپرست فروش', hint: 'عملکرد ویزیتورهای تیم', pick: (u) => u.find((x) => x.position === 'supervisor'), testid: 'login-supervisor' },
  { title: 'ویزیتور', hint: 'پنل بازی؛ مأموریت، امتیاز و رتبه', pick: (u) => u.find((x) => x.employee_code === 'VIS-002') ?? u.find((x) => x.position === 'rep'), testid: 'login-visitor' },
];

/** Demo entry screen. Real sign-in (SSO/OTP) is out of scope; each card opens a demo identity. */
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
      setError(err instanceof Error ? err.message : 'ورود انجام نشد.');
      setBusy(null);
    }
  };

  return (
    <div className="k-login">
      <div className="k-login__card">
        <Logo />
        <h1>دموی کیلوس</h1>
        <p className="k-muted">یک محصول، دو تجربه: پنل مدیریت و بازی ویزیتور. با یکی از نقش‌های نمایشی وارد شوید؛ بعداً از نوار کنترل دمو می‌توانید فوراً بین نقش‌ها جابه‌جا شوید.</p>
        <DemoBanner notice={data?.notice} />
        {expired && (
          <div className="k-state k-state--error" role="alert">
            <p>نشست شما منقضی شد. دوباره وارد شوید.</p>
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
        {data && (
          <div className="k-login__list k-login__list--roles">
            {ENTRIES.map((entry) => {
              const user = entry.pick(data.users);
              if (!user) return null;
              return (
                <button key={entry.testid} className="k-login__user" onClick={() => void pick(user)} disabled={busy !== null} data-testid={entry.testid}>
                  <b>{entry.title}</b>
                  <span>{entry.hint}</span>
                  <em dir="auto">
                    {user.name} · {POSITION_FA[user.position]}
                  </em>
                  {busy === user.id && <i className="k-login__busy">در حال ورود…</i>}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
