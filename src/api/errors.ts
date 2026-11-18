import type { MessageKey } from '../i18n/messages';
import { GameApiError } from './game';

export function apiErrorKey(error: unknown): MessageKey {
  if (!(error instanceof GameApiError)) return 'connection.errorGeneric';
  if (error.code === 'UNSUPPORTED_VERSION') return 'connection.errorVersion';
  if (error.code === 'COOKIE_BLOCKED') return 'connection.cookieBlocked';
  if (error.code === 'RECOVERY_UNRESOLVED') return 'connection.pendingUnconfirmed';
  if (error.code === 'INVALID_RESPONSE') return 'connection.errorResponse';
  if (error.code === 'DEMO_USERS_UNAVAILABLE') return 'connection.demoUsersUnavailable';
  if (error.code === 'DEMO_LOGIN_DISABLED') return 'connection.demoLoginDisabled';
  if (error.code === 'RATE_LIMITED') return 'connection.errorRateLimited';
  if (error.code === 'NETWORK_ERROR') return 'connection.errorNetwork';
  if (error.status === 401) return 'connection.errorAuth';
  if (error.status === 403) return 'connection.errorPermission';
  if (error.code === 'MISSION_LOCKED') return 'connection.errorLocked';
  if (error.code === 'IDEMPOTENCY_KEY_REUSED') return 'connection.pendingConflict';
  if (error.code === 'INSUFFICIENT_GAME_COINS') return 'store.error.insufficient_coins';
  if (error.code === 'OFFER_ALREADY_PURCHASED') return 'store.error.already_purchased';
  if (error.code === 'STORE_OFFER_NOT_FOUND') return 'store.error.unknown_offer';
  if (error.code === 'MISSION_EXPIRED') return 'connection.errorExpired';
  if (error.code === 'SUBMISSION_PENDING') return 'connection.errorPending';
  if (error.code === 'MAX_ATTEMPTS_REACHED' || error.code === 'MISSION_NOT_STARTABLE') return 'connection.errorLimit';
  if (['EVIDENCE_REQUIRED', 'INVALID_EVIDENCE_TYPE', 'EVIDENCE_TOO_LARGE', 'EVIDENCE_EMPTY'].includes(error.code)) return 'connection.errorEvidence';
  if (error.code === 'ANSWER_REQUIRED') return 'connection.errorAnswer';
  if (error.status === 400 || error.status === 404 || error.status === 422) return 'connection.errorValidation';
  return 'connection.errorGeneric';
}

/** A 4xx (other than rate limiting) means the submission was refused, so its idempotency key can be dropped. */
export function definitelyNotSubmitted(error: unknown): boolean {
  return error instanceof GameApiError && error.status >= 400 && error.status < 500 && error.status !== 429 && error.code !== 'IDEMPOTENCY_KEY_REUSED';
}

/** Only known BFF errors prove a FIRST submission was rejected before commit. */
export function definitelyNotCompleted(error: unknown): boolean {
  if (!(error instanceof GameApiError)) return false;
  if (error.status === 400) return ['IDEMPOTENCY_KEY_REQUIRED', 'INVALID_IDEMPOTENCY_KEY'].includes(error.code);
  if (error.status === 404) return error.code === 'MISSION_NOT_FOUND';
  if (error.status === 422) return ['INVALID_ANSWERS', 'UNKNOWN_ANSWER', 'INVALID_ANSWER', 'MISSION_INCOMPLETE'].includes(error.code);
  return error.status === 409 && error.code === 'MISSION_LOCKED';
}
