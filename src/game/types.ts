/** Core domain types for Sales Quest Arena. UI-free and backend-agnostic. */

export type MissionCategory =
  | 'customer_visit'
  | 'new_customer'
  | 'sales_achievement'
  | 'product_intro'
  | 'follow_up'
  | 'market_research';

export type MissionDifficulty = 'easy' | 'medium' | 'hard';

/** `pending_review` / `approved` / `rejected` / `expired` only come from DB missions (API v2). */
export type MissionStatus = 'locked' | 'available' | 'in_progress' | 'completed' | 'pending_review' | 'approved' | 'rejected' | 'expired';

export type AvatarId = 'fox' | 'bear' | 'cat' | 'bunny' | 'panda' | 'frog';

/* ---------- Mission steps (the reusable "mini-game" building blocks) ---------- */

export interface StepOption {
  id: string;
  label: string;
  emoji: string;
  hint?: string;
  /** Flags are read by the reward engine and achievements (e.g. "order_received"). */
  flags?: string[];
}

interface StepBase {
  id: string;
  /** Short label used in history ("Customer", "Outcome"...). */
  label: string;
  question: string;
  helper?: string;
}

export interface ChoiceStep extends StepBase {
  type: 'choice';
  options: StepOption[];
}

export interface RatingStep extends StepBase {
  type: 'rating';
  /** One label per star, index 0 = 1 star. */
  scale: [string, string, string, string, string];
}

export interface NoteStep extends StepBase {
  type: 'note';
  placeholder: string;
  maxLength: number;
  suggestions?: string[];
}

/** Image evidence. The file itself lives in the player's tab and is uploaded with the submission. */
export interface EvidenceStep extends StepBase {
  type: 'evidence';
  required: boolean;
}

export type MissionStep = ChoiceStep | RatingStep | NoteStep | EvidenceStep;

export type AnswerValue = string | number;
export type Answers = Record<string, AnswerValue>;

/* ---------- Missions ---------- */

export interface MissionUnlockRule {
  /** Mission that must be completed at least once. */
  afterMission?: string;
  /** Minimum player level. */
  minLevel?: number;
}

export interface MissionCompletionConditions {
  /** Step ids that must be answered before the mission can be completed. */
  requiredSteps: string[];
}

/** Static mission definition. Player-specific status is derived at runtime. */
export interface Mission {
  id: string;
  /** Position on the mission map. */
  order: number;
  title: string;
  shortTitle: string;
  description: string;
  category: MissionCategory;
  difficulty: MissionDifficulty;
  estimatedMinutes: number;
  xpReward: number;
  coinReward: number;
  unlock: MissionUnlockRule;
  completion: MissionCompletionConditions;
  steps: MissionStep[];
  /** Set only for missions served from the Kiloos database (API v2). */
  source?: 'server';
  instructions?: string;
  /** Organizational points: recorded in the Kiloos score ledger, never mixed with XP/coins. */
  orgPoints?: number;
  requiresReview?: boolean;
  requiresEvidence?: boolean;
  maxPerUser?: number;
  remaining?: number;
  endsAt?: string;
}

export type MissionBlockedReason = 'pending_review' | 'expired' | 'limit_reached';

export interface SubmissionSummary {
  id: string;
  status: 'submitted' | 'approved' | 'rejected';
  rejectionReason: string | null;
  submittedAt: string;
  reviewedAt: string | null;
}

/** Mission definition + the current player's state for it. */
export interface MissionView extends Mission {
  status: MissionStatus;
  completions: number;
  bestRating: number | null;
  /** Human readable unlock requirement when locked. */
  lockReason: string | null;
  /** 0..1 progress of an unfinished run. */
  draftProgress: number;
  isDaily: boolean;
  dailyDone: boolean;
  /** DB missions only: false when the server will refuse a new start. */
  canStart?: boolean;
  blockedReason?: MissionBlockedReason | null;
  latestSubmission?: SubmissionSummary | null;
}

/* ---------- Rewards ---------- */

export interface RewardLine {
  ruleId: string;
  label: string;
  xp: number;
  coins: number;
}

export interface RewardSummary {
  lines: RewardLine[];
  xp: number;
  coins: number;
}

/* ---------- Player progress (the single persisted document) ---------- */

export interface MissionDraft {
  missionId: string;
  stepIndex: number;
  answers: Answers;
  startedAt: string;
}

export interface MissionRecord {
  completions: number;
  firstCompletedAt: string;
  lastCompletedAt: string;
  bestRating: number | null;
}

export interface HistoryEntry {
  id: string;
  missionId: string;
  completedAt: string;
  answers: Answers;
  flags: string[];
  wasDaily: boolean;
  rewards: RewardSummary;
  xpBefore: number;
  xpAfter: number;
  coinsAfter: number;
  levelBefore: number;
  levelAfter: number;
  streakAfter: number;
  achievementsUnlocked: string[];
}

/**
 * Device-only demo store state. It is a local convenience record, never a
 * server-owned value: server mode neither reads nor writes it.
 */
export interface StoreState {
  /** Offer ids bought on this device, in purchase order. */
  purchased: string[];
}

export interface DailyChallengeState {
  /** YYYY-MM-DD: local day in device mode, server UTC date_key in server mode. */
  date: string;
  missionId: string;
  completed: boolean;
}

export interface PlayerProgress {
  version: 1;
  player: {
    name: string;
    avatar: AvatarId;
    onboarded: boolean;
    createdAt: string;
  };
  xp: number;
  coins: number;
  streak: {
    count: number;
    best: number;
    lastActiveDate: string | null;
  };
  missions: Record<string, MissionRecord>;
  drafts: Record<string, MissionDraft>;
  daily: DailyChallengeState | null;
  /** achievement id -> ISO date unlocked */
  achievements: Record<string, string>;
  /** Newest first. */
  history: HistoryEntry[];
  /**
   * Demo store purchases. Optional so older saves and server projections that
   * never carried a store section keep working; local code defaults it.
   */
  store?: StoreState;
}
