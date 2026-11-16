/**
 * Same-origin API client for the Kiloos backend (FastAPI, `/api/v1/*`).
 *
 * - Identity is the HttpOnly session cookie set by the server; nothing sensitive lives in JS.
 * - State-changing calls send the CSRF token the server issued at login/bootstrap.
 * - Reward-producing calls carry an `Idempotency-Key`, so a retry can never pay twice.
 * - A 401 on a signed-in session is broadcast so the UI can show "session expired".
 */

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly extra: Record<string, unknown>;

  constructor(status: number, code: string, message: string, extra: Record<string, unknown> = {}) {
    super(message);
    this.status = status;
    this.code = code;
    this.extra = extra;
  }

  /** True when the request never reached the server (offline, server restarting). */
  get isNetwork(): boolean {
    return this.status === 0;
  }
}

let csrfToken = '';
const expiredListeners = new Set<() => void>();

export function setCsrfToken(token: string): void {
  csrfToken = token;
}

/** Subscribe to "the server says you are no longer signed in". Returns an unsubscribe fn. */
export function onSessionExpired(listener: () => void): () => void {
  expiredListeners.add(listener);
  return () => expiredListeners.delete(listener);
}

interface RequestOptions {
  body?: unknown;
  form?: FormData;
  idempotencyKey?: string;
  /** Skip the global "session expired" broadcast (used while probing the session). */
  quiet401?: boolean;
}

async function request<T>(method: string, path: string, options: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (method !== 'GET') headers['X-CSRF-Token'] = csrfToken;
  if (options.body !== undefined) headers['Content-Type'] = 'application/json';
  if (options.idempotencyKey) headers['Idempotency-Key'] = options.idempotencyKey;

  let response: Response;
  try {
    response = await fetch(path, {
      method,
      headers,
      credentials: 'same-origin',
      body: options.form ?? (options.body !== undefined ? JSON.stringify(options.body) : undefined),
    });
  } catch {
    throw new ApiError(0, 'NETWORK', 'Cannot reach the server. Check the connection and try again.');
  }

  const fromHeader = response.headers.get('X-CSRF-Token');
  if (fromHeader) csrfToken = fromHeader;

  const text = await response.text();
  let data: unknown = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = null;
    }
  }

  if (!response.ok) {
    const info = (data as { error?: { code?: string; message?: string } } | null)?.error;
    const detail = (data as { detail?: unknown } | null)?.detail;
    const message = info?.message ?? (typeof detail === 'string' ? detail : null) ?? response.statusText ?? 'Request failed';
    const error = new ApiError(response.status, info?.code ?? `HTTP_${response.status}`, message, (info ?? {}) as Record<string, unknown>);
    if (response.status === 401 && !options.quiet401) expiredListeners.forEach((listener) => listener());
    throw error;
  }
  return data as T;
}

export const api = {
  get: <T>(path: string, options?: RequestOptions) => request<T>('GET', path, options),
  post: <T>(path: string, body?: unknown, options: RequestOptions = {}) => request<T>('POST', path, { ...options, body }),
  put: <T>(path: string, body?: unknown, options: RequestOptions = {}) => request<T>('PUT', path, { ...options, body }),
  patch: <T>(path: string, body?: unknown, options: RequestOptions = {}) => request<T>('PATCH', path, { ...options, body }),
  del: <T>(path: string, options: RequestOptions = {}) => request<T>('DELETE', path, options),
  upload: <T>(path: string, form: FormData) => request<T>('POST', path, { form }),
};

/** UUID for Idempotency-Key headers (falls back where `crypto.randomUUID` is unavailable). */
export function newIdempotencyKey(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `k-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

/** Build-time switch: `VITE_GAME_MODE=server` serves the unified Kiloos app, default is local-only. */
export const GAME_MODE: 'local' | 'server' = import.meta.env.VITE_GAME_MODE === 'server' ? 'server' : 'local';
