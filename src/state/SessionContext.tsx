import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api, ApiError, onSessionExpired, setCsrfToken } from '../api/client';
import type { SessionUser } from '../api/types';
import { navigate } from '../router';

export type SessionStatus = 'loading' | 'anonymous' | 'ready' | 'expired' | 'error';

interface SessionValue {
  status: SessionStatus;
  user: SessionUser | null;
  notice: string;
  error: string | null;
  login: (userId: string) => Promise<void>;
  logout: () => Promise<void>;
  retry: () => void;
}

const SessionContext = createContext<SessionValue | null>(null);

interface MeResponse {
  user: SessionUser;
  csrf_token: string;
  notice: string;
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<SessionStatus>('loading');
  const [user, setUser] = useState<SessionUser | null>(null);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState<string | null>(null);

  const probe = useCallback(async () => {
    setStatus('loading');
    setError(null);
    try {
      const me = await api.get<MeResponse>('/api/v1/auth/me', { quiet401: true });
      setCsrfToken(me.csrf_token);
      setUser(me.user);
      setNotice(me.notice);
      setStatus('ready');
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setUser(null);
        setStatus('anonymous');
      } else {
        setError(err instanceof Error ? err.message : 'Could not reach the server.');
        setStatus('error');
      }
    }
  }, []);

  useEffect(() => {
    void probe();
  }, [probe]);

  // A 401 while signed in means the session timed out or the server restarted.
  useEffect(() => {
    return onSessionExpired(() => {
      setUser(null);
      setStatus((current) => (current === 'ready' ? 'expired' : current));
    });
  }, []);

  const login = useCallback(async (userId: string) => {
    const result = await api.post<MeResponse>('/api/v1/auth/demo-login', { user_id: userId });
    setCsrfToken(result.csrf_token);
    setUser(result.user);
    setNotice(result.notice);
    setError(null);
    navigate('/', { replace: true });
    setStatus('ready');
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post('/api/v1/auth/logout');
    } catch {
      /* already signed out server-side — fall through and clear locally */
    }
    setCsrfToken('');
    setUser(null);
    navigate('/', { replace: true });
    setStatus('anonymous');
  }, []);

  const value = useMemo(() => ({ status, user, notice, error, login, logout, retry: () => void probe() }), [status, user, notice, error, login, logout, probe]);
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession must be used inside <SessionProvider>');
  return ctx;
}

/** Null outside server mode, so shared components can render without a session. */
export function useOptionalSession(): SessionValue | null {
  return useContext(SessionContext);
}
