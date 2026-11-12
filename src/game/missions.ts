import { GAME_CONFIG } from './config';
import type { Answers, Mission, MissionCategory, MissionDifficulty, MissionStep, NoteStep } from './types';

/* ------------------------------------------------------------------ */
/* Categories                                                          */
/* ------------------------------------------------------------------ */

export interface CategoryMeta {
  label: string;
  color: string;
  dark: string;
  soft: string;
}

export const CATEGORIES: Record<MissionCategory, CategoryMeta> = {
  customer_visit: { label: 'Customer Visit', color: '#2ea8ff', dark: '#1581d6', soft: '#e1f3ff' },
  product_intro: { label: 'Product Introduction', color: '#9366ff', dark: '#6f41e0', soft: '#efe7ff' },
  follow_up: { label: 'Customer Follow-up', color: '#19c9b2', dark: '#0e9f8c', soft: '#dcf8f3' },
  new_customer: { label: 'New Customer Acquisition', color: '#ff6b8e', dark: '#dd446b', soft: '#ffe5ec' },
  market_research: { label: 'Market Research', color: '#ff8f3d', dark: '#de6a17', soft: '#ffeddd' },
  sales_achievement: { label: 'Sales Achievement', color: '#ffb81f', dark: '#e09200', soft: '#fff3d1' },
};

export const DIFFICULTY: Record<MissionDifficulty, { label: string; dots: number }> = {
  easy: { label: 'Easy', dots: 1 },
  medium: { label: 'Medium', dots: 2 },
  hard: { label: 'Hard', dots: 3 },
};

/* ------------------------------------------------------------------ */
/* Mission definitions                                                 */
/* ------------------------------------------------------------------ */

const BASE = {
  xpReward: GAME_CONFIG.rewards.missionXp,
  coinReward: GAME_CONFIG.rewards.missionCoins,
};

const noteStep = (overrides: Partial<NoteStep> = {}): NoteStep => ({
  id: 'note',
  type: 'note',
  label: 'Note',
  question: 'Add a short note',
  helper: 'One line is plenty.',
  placeholder: 'Anything worth remembering?',
  maxLength: 240,
  ...overrides,
});

export const CUSTOMER_VISIT_ID = 'customer-visit-challenge';

/**
 * Missions are plain data. Adding a mission = adding an object here
 * (or, later, loading it from an admin API). The gameplay screen renders
 * any mission from its `steps`.
 */
export const MISSIONS: Mission[] = [
  {
    id: CUSTOMER_VISIT_ID,
    order: 1,
    title: 'Customer Visit Challenge',
    shortTitle: 'Customer Visit',
    description: 'Visit a customer and record the result.',
    category: 'customer_visit',
    difficulty: 'easy',
    estimatedMinutes: 1,
    ...BASE,
    unlock: {},
    completion: { requiredSteps: ['customer_type', 'outcome', 'rating'] },
    steps: [
      {
        id: 'customer_type',
        type: 'choice',
        label: 'Customer',
        question: 'Who did you visit?',
        helper: 'Pick the one that fits best.',
        options: [
          { id: 'existing', label: 'Existing Customer', emoji: '🤝', hint: 'Someone you already work with' },
          { id: 'new', label: 'New Customer', emoji: '✨', hint: 'Just started buying from you' },
          { id: 'potential', label: 'Potential Customer', emoji: '🎯', hint: 'Not a customer… yet' },
        ],
      },
      {
        id: 'outcome',
        type: 'choice',
        label: 'Outcome',
        question: 'What happened during the visit?',
        helper: 'Choose the main result.',
        options: [
          { id: 'successful_meeting', label: 'Successful Meeting', emoji: '😊', hint: 'A good conversation' },
          { id: 'product_presentation', label: 'Product Presentation', emoji: '📦', hint: 'You showed what you offer' },
          { id: 'order_received', label: 'Order Received', emoji: '🛒', hint: 'Bonus XP!', flags: ['order_received'] },
          { id: 'follow_up_required', label: 'Follow-up Required', emoji: '📅', hint: 'More steps needed' },
          { id: 'customer_unavailable', label: 'Customer Unavailable', emoji: '🚪', hint: 'Nobody to talk to' },
        ],
      },
      {
        id: 'rating',
        type: 'rating',
        label: 'Rating',
        question: 'How did the visit go?',
        helper: 'Tap a star.',
        scale: ['Rough one', 'Could be better', 'It was okay', 'Went well', 'Nailed it!'],
      },
      noteStep({
        question: 'Add a short visit note',
        placeholder: 'e.g. Wants a quote for 20 units by Friday',
        suggestions: ['Asked for a price list', 'Call back next week', 'Met the decision maker'],
      }),
    ],
  },
  {
    id: 'product-spotlight',
    order: 2,
    title: 'Product Spotlight',
    shortTitle: 'Product Spotlight',
    description: 'Introduce a product to a customer and capture their reaction.',
    category: 'product_intro',
    difficulty: 'easy',
    estimatedMinutes: 1,
    ...BASE,
    unlock: { afterMission: CUSTOMER_VISIT_ID },
    completion: { requiredSteps: ['showcase', 'reaction', 'rating'] },
    steps: [
      {
        id: 'showcase',
        type: 'choice',
        label: 'Showcased',
        question: 'What did you put in the spotlight?',
        options: [
          { id: 'new_product', label: 'New Product', emoji: '🆕', hint: 'Fresh in the catalog' },
          { id: 'best_seller', label: 'Best Seller', emoji: '🏅', hint: 'A proven favorite' },
          { id: 'special_offer', label: 'Special Offer', emoji: '🏷️', hint: 'Discount or promotion' },
          { id: 'bundle', label: 'Product Bundle', emoji: '🎁', hint: 'Several items together' },
        ],
      },
      {
        id: 'reaction',
        type: 'choice',
        label: 'Reaction',
        question: 'How did the customer react?',
        options: [
          { id: 'ordered', label: 'Ordered on the Spot', emoji: '🛒', hint: 'Bonus XP!', flags: ['order_received'] },
          { id: 'loved_it', label: 'Loved It', emoji: '😍', hint: 'Clearly interested' },
          { id: 'curious', label: 'Curious', emoji: '🤔', hint: 'Asked questions' },
          { id: 'needs_time', label: 'Needs Time', emoji: '⏳', hint: 'Will think about it' },
          { id: 'not_interested', label: 'Not Interested', emoji: '🙅', hint: 'Not a fit right now' },
        ],
      },
      {
        id: 'rating',
        type: 'rating',
        label: 'Rating',
        question: 'How strong was your pitch?',
        scale: ['Stumbled', 'A bit shaky', 'Solid', 'Convincing', 'Showstopper!'],
      },
      noteStep({ placeholder: 'e.g. Liked the new size, asked about delivery time' }),
    ],
  },
  {
    id: 'follow-up-sprint',
    order: 3,
    title: 'Follow-up Sprint',
    shortTitle: 'Follow-up Sprint',
    description: 'Reconnect with a customer you spoke to before and log what moved.',
    category: 'follow_up',
    difficulty: 'easy',
    estimatedMinutes: 1,
    ...BASE,
    unlock: { afterMission: 'product-spotlight' },
    completion: { requiredSteps: ['channel', 'result', 'rating'] },
    steps: [
      {
        id: 'channel',
        type: 'choice',
        label: 'Channel',
        question: 'How did you follow up?',
        options: [
          { id: 'call', label: 'Phone Call', emoji: '📞' },
          { id: 'message', label: 'Message', emoji: '💬' },
          { id: 'email', label: 'Email', emoji: '✉️' },
          { id: 'in_person', label: 'In Person', emoji: '🚶' },
        ],
      },
      {
        id: 'result',
        type: 'choice',
        label: 'Result',
        question: 'What came out of it?',
        options: [
          { id: 'order', label: 'Order Received', emoji: '🛒', hint: 'Bonus XP!', flags: ['order_received'] },
          { id: 'meeting_booked', label: 'Meeting Booked', emoji: '📅', hint: 'Next step is set' },
          { id: 'still_deciding', label: 'Still Deciding', emoji: '🤔', hint: 'Keep it warm' },
          { id: 'no_answer', label: 'No Answer', emoji: '📵', hint: 'Try again later' },
          { id: 'not_interested', label: 'Not Interested', emoji: '🙅', hint: 'Closed for now' },
        ],
      },
      {
        id: 'rating',
        type: 'rating',
        label: 'Lead warmth',
        question: 'How warm is this lead now?',
        scale: ['Ice cold', 'Cool', 'Lukewarm', 'Warm', 'On fire!'],
      },
      noteStep({ placeholder: 'e.g. Decision next Tuesday, send updated offer' }),
    ],
  },
  {
    id: 'new-customer-hunt',
    order: 4,
    title: 'New Customer Hunt',
    shortTitle: 'New Customer Hunt',
    description: 'Find a brand-new prospect and log how far you got.',
    category: 'new_customer',
    difficulty: 'medium',
    estimatedMinutes: 2,
    ...BASE,
    unlock: { afterMission: 'follow-up-sprint', minLevel: 2 },
    completion: { requiredSteps: ['source', 'stage', 'rating'] },
    steps: [
      {
        id: 'source',
        type: 'choice',
        label: 'Source',
        question: 'How did you find them?',
        options: [
          { id: 'referral', label: 'Referral', emoji: '🗣️', hint: 'Someone recommended you' },
          { id: 'walk_in', label: 'Cold Visit', emoji: '🚶', hint: 'You knocked on the door' },
          { id: 'event', label: 'Event', emoji: '🎪', hint: 'Fair, meetup or exhibition' },
          { id: 'online', label: 'Online', emoji: '🌐', hint: 'Web or social media' },
        ],
      },
      {
        id: 'stage',
        type: 'choice',
        label: 'Stage',
        question: 'How far did you get?',
        options: [
          { id: 'first_contact', label: 'First Contact', emoji: '👋', hint: 'Introduced yourself' },
          { id: 'meeting_booked', label: 'Meeting Booked', emoji: '📅', hint: 'They want to hear more' },
          { id: 'offer_sent', label: 'Offer Sent', emoji: '📨', hint: 'Numbers are on the table' },
          { id: 'first_order', label: 'First Order', emoji: '🛒', hint: 'Bonus XP!', flags: ['order_received'] },
        ],
      },
      {
        id: 'rating',
        type: 'rating',
        label: 'Potential',
        question: 'How promising is this customer?',
        scale: ['Long shot', 'Maybe', 'Decent', 'Promising', 'Golden!'],
      },
      noteStep({ placeholder: 'e.g. Owner is Sara, buys monthly, prefers WhatsApp' }),
    ],
  },
  {
    id: 'market-scout',
    order: 5,
    title: 'Market Scout',
    shortTitle: 'Market Scout',
    description: 'Scout your territory and report one useful market insight.',
    category: 'market_research',
    difficulty: 'medium',
    estimatedMinutes: 2,
    ...BASE,
    unlock: { afterMission: 'new-customer-hunt' },
    completion: { requiredSteps: ['topic', 'finding', 'rating'] },
    steps: [
      {
        id: 'topic',
        type: 'choice',
        label: 'Topic',
        question: 'What did you scout?',
        options: [
          { id: 'competitor_prices', label: 'Competitor Prices', emoji: '💲' },
          { id: 'shelf_display', label: 'Shelf & Display', emoji: '🗄️' },
          { id: 'customer_needs', label: 'Customer Needs', emoji: '💡' },
          { id: 'new_trends', label: 'New Trends', emoji: '📈' },
        ],
      },
      {
        id: 'finding',
        type: 'choice',
        label: 'Finding',
        question: 'What did you find?',
        options: [
          { id: 'opportunity', label: 'An Opportunity', emoji: '🚀', hint: 'Room to grow' },
          { id: 'threat', label: 'A Threat', emoji: '⚠️', hint: 'Competition is moving' },
          { id: 'needs_deeper_look', label: 'Needs a Deeper Look', emoji: '🔬', hint: 'Worth another visit' },
          { id: 'nothing_new', label: 'Nothing New', emoji: '😌', hint: 'All quiet out there' },
        ],
      },
      {
        id: 'rating',
        type: 'rating',
        label: 'Insight value',
        question: 'How valuable is this insight?',
        scale: ['Trivia', 'Minor', 'Useful', 'Valuable', 'Game changer!'],
      },
      noteStep({ question: 'Describe what you saw', placeholder: 'e.g. Competitor dropped prices 10% on two items' }),
    ],
  },
  {
    id: 'sales-summit',
    order: 6,
    title: 'Sales Summit',
    shortTitle: 'Sales Summit',
    description: 'Celebrate a real sales win and claim your place at the summit.',
    category: 'sales_achievement',
    difficulty: 'hard',
    estimatedMinutes: 2,
    ...BASE,
    unlock: { afterMission: 'market-scout', minLevel: 3 },
    completion: { requiredSteps: ['win', 'size', 'rating'] },
    steps: [
      {
        id: 'win',
        type: 'choice',
        label: 'Win',
        question: 'What did you achieve?',
        options: [
          { id: 'closed_deal', label: 'Closed a Deal', emoji: '🛒', hint: 'Bonus XP!', flags: ['order_received'] },
          { id: 'hit_target', label: 'Hit My Target', emoji: '🎯', hint: 'Daily or weekly goal' },
          { id: 'upsell', label: 'Upsell', emoji: '⬆️', hint: 'Customer bought more' },
          { id: 'renewal', label: 'Renewal', emoji: '🔁', hint: 'Customer stayed with you' },
        ],
      },
      {
        id: 'size',
        type: 'choice',
        label: 'Size',
        question: 'How big was the win?',
        options: [
          { id: 'small', label: 'Small but Sweet', emoji: '🍬' },
          { id: 'medium', label: 'Solid', emoji: '💪' },
          { id: 'big', label: 'Big', emoji: '🏆' },
          { id: 'record', label: 'Record Breaking', emoji: '🚀' },
        ],
      },
      {
        id: 'rating',
        type: 'rating',
        label: 'Pride',
        question: 'How proud are you?',
        scale: ['Just a day', 'A little', 'Pleased', 'Proud', 'Legendary!'],
      },
      noteStep({ question: 'What made it work?', placeholder: 'e.g. Bundled delivery with the order' }),
    ],
  },
];

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

const BY_ID = new Map(MISSIONS.map((m) => [m.id, m]));

export function getMission(id: string): Mission | undefined {
  return BY_ID.get(id);
}

export function isStepAnswered(step: MissionStep, answers: Answers): boolean {
  const value = answers[step.id];
  switch (step.type) {
    case 'choice':
      return typeof value === 'string' && step.options.some((o) => o.id === value);
    case 'rating':
      return typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= 5;
    case 'note':
      return typeof value === 'string' && value.trim().length > 0;
  }
}

/** Completion conditions: every required step has a valid answer. */
export function isMissionComplete(mission: Mission, answers: Answers): boolean {
  return mission.completion.requiredSteps.every((stepId) => {
    const step = mission.steps.find((s) => s.id === stepId);
    return step ? isStepAnswered(step, answers) : false;
  });
}

export function isStepRequired(mission: Mission, step: MissionStep): boolean {
  return mission.completion.requiredSteps.includes(step.id);
}

/** Drops unknown/invalid answers and trims notes. Never trust UI input blindly. */
export function sanitizeAnswers(mission: Mission, answers: Answers): Answers {
  const clean: Answers = {};
  for (const step of mission.steps) {
    if (!isStepAnswered(step, answers)) continue;
    const value = answers[step.id];
    clean[step.id] = step.type === 'note' ? String(value).trim().slice(0, step.maxLength) : value;
  }
  return clean;
}

/** Flags of all selected options, plus derived ones used by achievements. */
export function collectFlags(mission: Mission, answers: Answers): string[] {
  const flags = new Set<string>();
  for (const step of mission.steps) {
    if (!isStepAnswered(step, answers)) continue;
    const value = answers[step.id];
    if (step.type === 'choice') {
      step.options.find((o) => o.id === value)?.flags?.forEach((f) => flags.add(f));
    } else if (step.type === 'rating' && value === 5) {
      flags.add('five_star');
    } else if (step.type === 'note') {
      flags.add('note_added');
    }
  }
  return [...flags];
}

export function getRating(mission: Mission, answers: Answers): number | null {
  const step = mission.steps.find((s) => s.type === 'rating');
  if (!step || !isStepAnswered(step, answers)) return null;
  return answers[step.id] as number;
}
