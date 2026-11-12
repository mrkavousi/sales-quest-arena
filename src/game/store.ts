import { GAME_CONFIG } from './config';
import type { Mission, MissionStatus, MissionView, PlayerProgress } from './types';

/**
 * Device-only demo store.
 *
 * Everything here is a local prototype: prices use the game's own demo coins,
 * nothing is charged for real money, and no purchase is ever uploaded or shown
 * as server-confirmed. Server mode reads the BFF's future `/store` routes
 * instead and never mixes in this state.
 */

/* ------------------------------------------------------------------ */
/* Special missions (kept out of the main six-mission catalog)          */
/* ------------------------------------------------------------------ */

/** Extra missions that only exist behind a demo-store purchase. */
export const SPECIAL_MISSIONS: Mission[] = [
  {
    id: 'vip-lounge',
    order: 101,
    title: 'VIP Lounge',
    shortTitle: 'VIP Lounge',
    description: 'Run a VIP-only conversation with your best customer.',
    category: 'sales_achievement',
    difficulty: 'medium',
    estimatedMinutes: 2,
    xpReward: GAME_CONFIG.rewards.missionXp,
    coinReward: GAME_CONFIG.rewards.missionCoins,
    unlock: {},
    completion: { requiredSteps: ['vip_topic', 'vip_outcome', 'rating'] },
    steps: [
      {
        id: 'vip_topic',
        type: 'choice',
        label: 'Topic',
        question: 'What did you talk about in the VIP lounge?',
        options: [
          { id: 'loyalty_offer', label: 'Loyalty Offer', emoji: '🎖️', hint: 'A thank-you for staying' },
          { id: 'exclusive_preview', label: 'Exclusive Preview', emoji: '👀', hint: 'First look at something new' },
          { id: 'partnership', label: 'Partnership', emoji: '🤝', hint: 'A bigger deal together' },
          { id: 'feedback', label: 'Feedback Session', emoji: '💬', hint: 'Listening first' },
        ],
      },
      {
        id: 'vip_outcome',
        type: 'choice',
        label: 'Outcome',
        question: 'How did the VIP respond?',
        options: [
          { id: 'big_order', label: 'Big Order', emoji: '🛒', hint: 'Bonus XP!', flags: ['order_received'] },
          { id: 'loved_it', label: 'Loved It', emoji: '😍' },
          { id: 'thinking', label: 'Needs Time', emoji: '⏳' },
          { id: 'no_answer', label: 'Could Not Meet', emoji: '📵' },
        ],
      },
      {
        id: 'rating',
        type: 'rating',
        label: 'Rating',
        question: 'How valuable was the VIP time?',
        scale: ['Awkward', 'A bit flat', 'Useful', 'Valuable', 'Star treatment!'],
      },
    ],
  },
  {
    id: 'midnight-route',
    order: 102,
    title: 'Midnight Route',
    shortTitle: 'Midnight Route',
    description: 'Plan an after-hours route for customers who can only talk late.',
    category: 'market_research',
    difficulty: 'hard',
    estimatedMinutes: 2,
    xpReward: GAME_CONFIG.rewards.missionXp,
    coinReward: GAME_CONFIG.rewards.missionCoins,
    unlock: {},
    completion: { requiredSteps: ['route_plan', 'route_result', 'rating'] },
    steps: [
      {
        id: 'route_plan',
        type: 'choice',
        label: 'Route',
        question: 'What kind of route did you plan?',
        options: [
          { id: 'late_shops', label: 'Late-night Shops', emoji: '🌙' },
          { id: 'warehouse', label: 'Warehouse Stop', emoji: '🏭' },
          { id: 'delivery_hub', label: 'Delivery Hub', emoji: '🚚' },
          { id: 'home_visits', label: 'Home Visits', emoji: '🏠' },
        ],
      },
      {
        id: 'route_result',
        type: 'choice',
        label: 'Result',
        question: 'What did the midnight route produce?',
        options: [
          { id: 'surprise_order', label: 'Surprise Order', emoji: '🛒', hint: 'Bonus XP!', flags: ['order_received'] },
          { id: 'relationship', label: 'Stronger Relationship', emoji: '🤝' },
          { id: 'intel', label: 'Useful Market Intel', emoji: '🧭' },
          { id: 'nothing', label: 'Nothing Yet', emoji: '🌫️' },
        ],
      },
      {
        id: 'rating',
        type: 'rating',
        label: 'Rating',
        question: 'Was the late shift worth it?',
        scale: ['Waste of night', 'Meh', 'Okay', 'Worth it', 'Night owl hero!'],
      },
    ],
  },
];

/** Offer ids double as the mission ids they unlock, so a purchase is one record. */
export interface StoreOffer {
  id: string;
  missionId: string;
  price: number;
  /** Emoji used by the store card illustration. */
  emoji: string;
  /** Never a real-money product: this is always demo currency. */
  demo: true;
}

export const STORE_OFFERS: readonly StoreOffer[] = [
  { id: 'vip-lounge-pass', missionId: 'vip-lounge', price: 40, emoji: '🎟️', demo: true },
  { id: 'midnight-route-pass', missionId: 'midnight-route', price: 60, emoji: '🌙', demo: true },
];

const OFFERS = new Map(STORE_OFFERS.map((offer) => [offer.id, offer]));
const SPECIAL = new Map(SPECIAL_MISSIONS.map((mission) => [mission.id, mission]));

export function getOffer(id: string): StoreOffer | undefined {
  return OFFERS.get(id);
}

export function getSpecialMission(id: string): Mission | undefined {
  return SPECIAL.get(id);
}

export function isSpecialMissionId(id: string): boolean {
  return SPECIAL.has(id);
}

/** Purchased offer ids, or an empty list for older saves with no store section. */
export function getPurchased(progress: PlayerProgress): string[] {
  return progress.store?.purchased ?? [];
}

export function isOfferPurchased(progress: PlayerProgress, offer: StoreOffer): boolean {
  return getPurchased(progress).includes(offer.id);
}

/** The special mission behind an offer, once it has been bought. */
export function isSpecialUnlocked(progress: PlayerProgress, missionId: string): boolean {
  const offer = STORE_OFFERS.find((item) => item.missionId === missionId);
  return offer ? isOfferPurchased(progress, offer) : false;
}

/** Special missions the player has bought, in catalog order. */
export function getUnlockedSpecialMissions(progress: PlayerProgress): Mission[] {
  return SPECIAL_MISSIONS.filter((mission) => isSpecialUnlocked(progress, mission.id)).sort((a, b) => a.order - b.order);
}

function specialStatus(progress: PlayerProgress, missionId: string): MissionStatus {
  if (progress.drafts[missionId]) return 'in_progress';
  if ((progress.missions[missionId]?.completions ?? 0) > 0) return 'completed';
  return 'available';
}

/**
 * Views for purchased specials only. They are rendered on a separate screen and
 * never inserted into the six-mission map, list, daily pick or server contract.
 */
export function getSpecialMissionViews(progress: PlayerProgress): MissionView[] {
  return getUnlockedSpecialMissions(progress).map((mission) => ({
    ...mission,
    status: specialStatus(progress, mission.id),
    completions: progress.missions[mission.id]?.completions ?? 0,
    bestRating: progress.missions[mission.id]?.bestRating ?? null,
    lockReason: null,
    draftProgress: progress.drafts[mission.id] ? Math.min(1, progress.drafts[mission.id].stepIndex / mission.steps.length) : 0,
    isDaily: false,
    dailyDone: false,
  }));
}

/* ------------------------------------------------------------------ */
/* Purchase                                                            */
/* ------------------------------------------------------------------ */

export type PurchaseError = 'unknown_offer' | 'already_purchased' | 'insufficient_coins';

export class StoreError extends Error {
  constructor(readonly code: PurchaseError) {
    super(code);
  }
}

export interface PurchaseResult {
  progress: PlayerProgress;
  offer: StoreOffer;
  pricePaid: number;
  coinsBefore: number;
  coinsAfter: number;
}

/**
 * Atomic device-only purchase: one step either debits coins and records the
 * offer, or throws without returning a changed progress object.
 *
 * All checks run before any value is copied, so callers can commit
 * `result.progress` wholesale and never see a half-applied balance or a
 * mission unlocked without the matching debit.
 */
export function purchaseOffer(current: PlayerProgress, offerId: string): PurchaseResult {
  const offer = getOffer(offerId);
  if (!offer) throw new StoreError('unknown_offer');
  // Duplicate purchases never charge twice, even when a UI double-fires.
  if (isOfferPurchased(current, offer)) throw new StoreError('already_purchased');
  const coins = Number.isSafeInteger(current.coins) ? current.coins : 0;
  if (coins < offer.price) throw new StoreError('insufficient_coins');

  const next: PlayerProgress = {
    ...current,
    coins: coins - offer.price,
    store: { purchased: [...getPurchased(current), offer.id] },
  };
  return { progress: next, offer, pricePaid: offer.price, coinsBefore: coins, coinsAfter: next.coins };
}

/** True when the offer can be bought right now (used for button state only). */
export function canAfford(progress: PlayerProgress, offer: StoreOffer): boolean {
  return !isOfferPurchased(progress, offer) && progress.coins >= offer.price;
}
