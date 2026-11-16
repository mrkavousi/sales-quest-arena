/**
 * Same-origin API client for the Kiloos backend (FastAPI, `/api/v1/*`).
 *
 * - Identity is the HttpOnly session cookie set by the server; nothing sensitive lives in JS.
 * - State-changing calls send the CSRF token the server issued at login/bootstrap.
 * - Reward-producing calls carry an `Idempotency-Key`, so a retry can never pay twice.
 * - A 401 on a signed-in session is broadcast so the UI can show "session expired".
 */

const ERROR_FA: Record<string, string> = {
  INVALID_IDEMPOTENCY_KEY: 'درخواست نامعتبر است؛ دوباره تلاش کنید.',
  IDEMPOTENCY_KEY_REUSED: 'این درخواست قبلاً با داده‌ای دیگر ارسال شده است.',
  MISSION_NOT_FOUND: 'مأموریت پیدا نشد یا برای شما فعال نیست.',
  QUEST_NOT_FOUND: 'چالش هفتگی پیدا نشد.',
  QUEST_NOT_COMPLETE: 'هدف این چالش هنوز کامل نشده است.',
  QUEST_ALREADY_CLAIMED: 'پاداش این چالش در این هفته قبلاً دریافت شده است.',
  RATE_LIMITED: 'تعداد درخواست‌ها زیاد است؛ کمی بعد تلاش کنید.',
  NO_FILE: 'فایلی انتخاب نشده است.',
  EMPTY_FILE: 'فایل خالی است.',
  FILE_TOO_LARGE: 'حجم فایل از حد مجاز بیشتر است.',
  INVALID_WORKBOOK: 'فایل اکسل معتبر نیست یا برگه‌های لازم را ندارد.',
  DUPLICATE_FILE: 'همین فایل قبلاً بارگذاری شده است؛ چیزی دوباره وارد نشد.',
  INVALID_ANSWERS: 'پاسخ‌ها نامعتبر است.',
  MISSION_INCOMPLETE: 'مراحل الزامی مأموریت هنوز پاسخ داده نشده است.',
};
const STATUS_FA: Record<number, string> = {
  400: 'درخواست نامعتبر است.',
  401: 'نشست شما منقضی شده است.',
  403: 'شما به این بخش دسترسی ندارید.',
  404: 'مورد درخواستی پیدا نشد.',
  409: 'این عملیات اکنون ممکن نیست.',
  422: 'اطلاعات واردشده معتبر نیست.',
  500: 'خطای سرور؛ دوباره تلاش کنید.',
};

/** Persian message for an API error: known codes first, server text if it is already Persian. */
function persianError(code: string | undefined, status: number, raw: string): string {
  if (code && ERROR_FA[code]) return ERROR_FA[code];
  if (/[\u0600-\u06FF]/.test(raw)) return raw;
  return STATUS_FA[status] ?? 'درخواست انجام نشد.';
}

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
    throw new ApiError(0, 'NETWORK', 'ارتباط با سرور برقرار نشد. اتصال را بررسی کنید و دوباره تلاش کنید.');
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
    const raw = info?.message ?? (typeof detail === 'string' ? detail : null) ?? response.statusText ?? '';
    const message = persianError(info?.code, response.status, raw);
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
