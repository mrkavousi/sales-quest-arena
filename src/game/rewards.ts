import { GAME_CONFIG } from './config';
import type { Answers, Mission, RewardLine, RewardSummary } from './types';

export interface RewardContext {
  mission: Mission;
  answers: Answers;
  /** Flags collected from the selected options (e.g. "order_received"). */
  flags: ReadonlySet<string>;
  /** True when this run counts as today's daily challenge. */
  isDaily: boolean;
}

export interface RewardRule {
  id: string;
  label: string;
  applies: (ctx: RewardContext) => boolean;
  xp: (ctx: RewardContext) => number;
  coins: (ctx: RewardContext) => number;
}

export const FLAG_ORDER_RECEIVED = 'order_received';

/**
 * Reward rules are evaluated in order; every matching rule adds a line.
 * To add a rule (team bonus, streak multiplier, campaign...) append to this list.
 */
export const REWARD_RULES: RewardRule[] = [
  {
    id: 'mission_complete',
    label: 'Mission complete',
    applies: () => true,
    xp: (ctx) => ctx.mission.xpReward,
    coins: (ctx) => ctx.mission.coinReward,
  },
  {
    id: 'daily_bonus',
    label: 'Daily challenge bonus',
    applies: (ctx) => ctx.isDaily,
    xp: () => GAME_CONFIG.rewards.dailyBonusXp,
    coins: () => 0,
  },
  {
    id: 'order_bonus',
    label: 'Order received bonus',
    applies: (ctx) => ctx.flags.has(FLAG_ORDER_RECEIVED),
    xp: () => GAME_CONFIG.rewards.orderBonusXp,
    coins: () => 0,
  },
];

export function calculateRewards(ctx: RewardContext, rules: RewardRule[] = REWARD_RULES): RewardSummary {
  const lines: RewardLine[] = rules
    .filter((rule) => rule.applies(ctx))
    .map((rule) => ({ ruleId: rule.id, label: rule.label, xp: rule.xp(ctx), coins: rule.coins(ctx) }));
  return {
    lines,
    xp: lines.reduce((sum, l) => sum + l.xp, 0),
    coins: lines.reduce((sum, l) => sum + l.coins, 0),
  };
}
