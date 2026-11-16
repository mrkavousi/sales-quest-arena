import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '../api/client';
import type { DemoUser } from '../api/types';
import { POSITION_FA } from '../i18n';
import { useSession } from '../state/SessionContext';

interface DemoUsers {
  users: DemoUser[];
}

/** The four demo roles. "مدیر کل" covers the administrator and the head of sales. */
const ROLES: { key: string; label: string; match: (u: DemoUser) => boolean }[] = [
  { key: 'gm', label: 'مدیر کل', match: (u) => u.position === 'admin' || u.position === 'management' },
  { key: 'branch', label: 'مدیر شعبه', match: (u) => u.position === 'branch_manager' },
  { key: 'supervisor', label: 'سرپرست فروش', match: (u) => u.position === 'supervisor' },
  { key: 'visitor', label: 'ویزیتور', match: (u) => u.position === 'rep' },
];

const MANAGER_KEY = 'kiloos.demo.manager';

function rememberManager(id: string): void {
  try {
    window.sessionStorage.setItem(MANAGER_KEY, id);
  } catch {
    /* storage blocked: "return to admin" falls back to the first administrator */
  }
}

/** Switches the demo identity from anywhere (for example the visitor list), remembering the manager to return to. */
export function useDemoSwitch(): (userId: string) => Promise<void> {
  const { user, login } = useSession();
  return useCallback(
    async (userId: string) => {
      if (user?.experience === 'management') rememberManager(user.id);
      await login(userId);
    },
    [user, login],
  );
}

function remembered(): string | null {
  try {
    return window.sessionStorage.getItem(MANAGER_KEY);
  } catch {
    return null;
  }
}

/**
 * Demo control center: switches the demo identity instantly, without signing out.
 * This is a presentation aid for the demo environment only. Every request after a switch is
 * authorized by the server for the chosen identity; nothing is decided in the browser.
 */
export function DemoBar() {
  const { user, login } = useSession();
  const [users, setUsers] = useState<DemoUser[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<DemoUsers>('/api/v1/auth/demo-users', { quiet401: true })
      .then((data) => setUsers(data.users))
      .catch(() => setUsers([]));
  }, []);

  const activeRole = useMemo(() => ROLES.find((role) => user && role.match(user)) ?? null, [user]);
  const peers = useMemo(() => (activeRole ? users.filter(activeRole.match) : []), [users, activeRole]);

  const switchTo = useCallback(
    async (target: DemoUser | undefined) => {
      if (!target || !user || busy || target.id === user.id) return;
      setBusy(true);
      setMessage(null);
      if (user.experience === 'management') rememberManager(user.id);
      try {
        await login(target.id);
      } catch {
        setMessage('تغییر هویت نمایشی انجام نشد. دوباره تلاش کنید.');
      } finally {
        setBusy(false);
      }
    },
    [user, busy, login],
  );

  const backToAdmin = () => {
    const stored = remembered();
    const target = users.find((u) => u.id === stored) ?? users.find((u) => u.position === 'admin');
    void switchTo(target);
  };

  const reset = async () => {
    if (!window.confirm('همه داده‌های نمایشی به حالت اولیه بازمی‌گردد و سناریوی نمونه دوباره بارگذاری می‌شود. ادامه می‌دهید؟')) return;
    setBusy(true);
    setMessage(null);
    try {
      await api.post('/api/v1/demo/reset', {});
      window.location.reload();
    } catch {
      setMessage('بازنشانی دمو انجام نشد. فقط مدیر کل در محیط نمایشی مجاز است.');
      setBusy(false);
    }
  };

  if (!user) return null;
  const isVisitor = user.experience === 'game';

  return (
    <div className="demo-bar" role="region" aria-label="کنترل دمو" data-testid="demo-bar">
      <span className="demo-bar__badge">کنترل دمو</span>
      <div className="demo-bar__who" aria-live="polite">
        <b dir="auto" data-testid="whoami">
          {user.name}
        </b>
        <small>{POSITION_FA[user.position] ?? user.title}</small>
      </div>

      <div className="demo-bar__roles" role="group" aria-label="تغییر نقش نمایشی">
        {ROLES.map((role) => (
          <button
            key={role.key}
            type="button"
            className={`demo-bar__role${activeRole?.key === role.key ? ' is-on' : ''}`}
            aria-pressed={activeRole?.key === role.key}
            disabled={busy || users.length === 0}
            data-testid={`role-${role.key}`}
            onClick={() => {
              const list = users.filter(role.match);
              // The visitor role opens the featured demo visitor (VIS-002) when available.
              void switchTo(role.key === 'visitor' ? list.find((u) => u.employee_code === 'VIS-002') ?? list[0] : list[0]);
            }}
          >
            {role.label}
          </button>
        ))}
      </div>

      {peers.length > 1 && (
        <label className="demo-bar__pick">
          <span className="sr-only">انتخاب کاربر</span>
          <select value={user.id} disabled={busy} onChange={(e) => void switchTo(users.find((u) => u.id === e.target.value))} data-testid="user-picker">
            {peers.map((peer) => (
              <option key={peer.id} value={peer.id}>
                {peer.name}
                {peer.employee_code ? ` · ${peer.employee_code}` : ''}
              </option>
            ))}
          </select>
        </label>
      )}

      {isVisitor && (
        <button type="button" className="demo-bar__back" onClick={backToAdmin} disabled={busy} data-testid="back-to-admin">
          بازگشت به پنل مدیریت
        </button>
      )}
      {user.position === 'admin' && (
        <button type="button" className="demo-bar__reset" onClick={() => void reset()} disabled={busy} data-testid="demo-reset">
          بازنشانی دمو
        </button>
      )}
      {message && (
        <span className="demo-bar__msg" role="alert">
          {message}
        </span>
      )}
    </div>
  );
}
