import type { MessageKey } from '../i18n/messages';
import type { MissionView } from './types';

/** Why the server refuses to start a DB mission now (matches the backend `blockedReason`). */
export function blockedKey(mission: Pick<MissionView, 'blockedReason'>): MessageKey {
  switch (mission.blockedReason) {
    case 'pending_review': return 'server.blocked.pending_review';
    case 'expired': return 'server.blocked.expired';
    default: return 'server.blocked.limit_reached';
  }
}

/** Step ids that exist only in the play screen and must never be sent as draft answers. */
const LOCAL_ONLY_ANSWERS = ['evidence'];

export function withoutLocalOnly<T extends Record<string, string | number>>(answers: T): T {
  const clean = { ...answers };
  for (const key of LOCAL_ONLY_ANSWERS) delete clean[key];
  return clean;
}
