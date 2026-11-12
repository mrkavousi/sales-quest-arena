# Sales Quest Arena

A small, playable gamification MVP for sales reps and field agents.
It is a **game** that happens to record real-world sales activities — not a CRM dashboard.

## Run it

```bash
npm install
npm start          # production build + server on http://localhost:4173
npm run dev        # dev server with hot reload on http://localhost:5173
npm test           # game-engine and localization unit tests
npm run build:standalone   # one self-contained file: standalone/index.html

# With npm start running in another terminal:
npx playwright install chromium
npm run test:e2e    # English smoke test and Persian end-to-end playthrough
```

Stack: React 18 + TypeScript + Vite. No UI kit, no animation library, no 3D engine —
animations are CSS plus a ~100-line canvas confetti. Illustrations are original inline SVG.

## Deploy to Vercel

Import the GitHub repository into a Vercel project and deploy the branch containing
these changes. `vercel.json` configures the Vite build (`npm ci`, `npm run build`,
output directory `dist`); no environment variables or backend are required. The app
uses hash-based navigation, so it does not need a catch-all rewrite. Vercel normally
uses the configured production branch for the production URL and other branches for
preview deployments.

Game progress and the language preference are stored in the browser, scoped to the
site's origin. They do not automatically transfer between localhost, a Vercel preview
URL, and the production URL, or between different devices.

## What is in version 1

| Module | Where |
| --- | --- |
| Game home / Arena (HUD, daily challenge, mission map, progress, badges) | `src/pages/ArenaPage.tsx` |
| Player profile & level path | `src/pages/ProfilePage.tsx` |
| Mission selection (map + filterable list) | `MissionMap`, `MissionCard`, `MissionsPage` |
| Mission introduction | `MissionDetail` |
| Playable mission: **Customer Visit Challenge** (4 challenges) | `components/play/MissionGameplay.tsx`, `MissionStep.tsx` |
| Completion & rewards (confetti, counters, level-up, achievements) | `components/play/MissionResult.tsx`, `RewardAnimation.tsx` |
| Mission history | `src/pages/HistoryPage.tsx` |

Five more missions (one per remaining category) are defined as data and unlock one after
another, so the map keeps going after the first win. They reuse the same three step types.

### Game rules (all in `src/game/config.ts`)

- Mission complete: **100 XP + 20 coins**
- Daily challenge: **+50 XP** (once per day)
- Order received: **+30 XP**
- Levels: Rookie 0 · Explorer 150 · Challenger 400 · Performer 800 · Champion 1400 XP
- Streak: +1 for each consecutive day with a completed mission; resets after a missed day
- Missions can be replayed (reps visit customers every day); each run is logged in history

## Architecture

```
src/
  game/                 Pure game logic — no React, no DOM (except storage.ts)
    types.ts            Mission, steps, PlayerProgress, HistoryEntry…
    config.ts           Tunable numbers: rewards, level thresholds
    missions.ts         Mission definitions + completion conditions
    levels.ts           XP → level
    rewards.ts          Rule-based reward calculation
    achievements.ts     Badge definitions and conditions
    progress.ts         Derived state: mission status, streak, daily challenge, stats
    completeMission.ts  (progress, mission, answers, time) → new progress + history entry
    storage.ts          Persistence adapter (localStorage, verified writes)
    engine.test.ts      Unit tests
  i18n/                 English/Persian UI strings, translated game content and locale helpers
    LanguageContext.tsx Language preference, document language and direction
    locale.test.ts      Translation coverage, formatting and save-compatibility tests
  state/GameContext.tsx Single store; one `commit()` path that updates memory and saves
  router.ts             Tiny hash router
  components/           PlayerHeader, MissionMap, MissionCard, MissionDetail, DailyChallenge,
                        PlayerProgress, AchievementBadge, AppLayout
    play/               MissionGameplay, MissionStep, MissionResult, RewardAnimation
    art/                Avatar, Mascot ("Pip"), MissionArt, Scenery
    ui/                 Icon, Progress, Sheet, Confetti, motion helpers
  pages/                Welcome, Arena, Missions, History, Profile, Play/Result
  styles/               tokens.css (design system) + one stylesheet per area
```

Mission **status** (Locked / Available / In Progress / Completed) is never stored — it is
derived from the player's progress, so it cannot drift out of sync.

### Persistence

Progress lives in `localStorage` under `sales-quest-arena:progress:v1`.
Every write is read back and verified. If the browser blocks storage (private mode,
sandboxed embeds) the game still runs and shows a clear "progress is not being saved"
banner instead of pretending.

### Languages

English and Persian are available from the welcome screen, the navigation bar, the
profile, or the pause dialog. The first supported browser language is used initially
(with English as the fallback); an explicit selection is stored separately under
`sales-quest-arena:language:v1` and remains selected even when game progress is reset.
If storage is blocked, the selection lasts for the current session only.

Persian uses a bundled Vazirmatn font, right-to-left layouts, Persian digits and the
Persian calendar for history dates. Mission and reward translations are looked up by
stable IDs, so switching languages does not change saved progress, answers, or the
player's own notes. Older English saves continue to work.

## Extending it

**Add a mission** — append an object to `MISSIONS` in `src/game/missions.ts`:

```ts
{
  id: 'demo-day', order: 7, title: 'Demo Day', shortTitle: 'Demo Day',
  description: 'Run a product demo and log the reaction.',
  category: 'product_intro', difficulty: 'medium', estimatedMinutes: 2,
  xpReward: 100, coinReward: 20,
  unlock: { afterMission: 'sales-summit', minLevel: 3 },
  completion: { requiredSteps: ['audience', 'rating'] },
  steps: [
    { id: 'audience', type: 'choice', label: 'Audience', question: 'Who watched?', options: [/* … */] },
    { id: 'rating', type: 'rating', label: 'Rating', question: 'How did it land?', scale: ['…','…','…','…','…'] },
  ],
}
```

It appears on the map and in the list, and is playable, with no UI changes. Add its
Persian title, description, and step/option copy keyed by ID to `PERSIAN_MISSIONS` in
`src/i18n/content.ts`. The localization tests check that built-in content is complete.
Unknown content falls back to its original text rather than affecting gameplay.

**Add a reward rule** — append to `REWARD_RULES` in `src/game/rewards.ts` and translate its ID in `PERSIAN_REWARDS`.
**Add a badge** — append to `ACHIEVEMENTS` in `src/game/achievements.ts` and translate its ID in `PERSIAN_ACHIEVEMENTS`.
**Add a step type** (photo, number, location…) — add it to the `MissionStep` union in
`types.ts` and a view in `components/play/MissionStep.tsx`.

## Not built yet (Phase 3)

- Backend: replace the three functions in `storage.ts` with API calls and run
  `completeMission()` on the server to validate results.
- Real sales data (CRM visits/orders completing missions automatically)
- Team competitions and leaderboards
- Admin mission configuration (serve `MISSIONS` and `GAME_CONFIG` from an API)
- A coin shop — coins are earned and stored, but there is nothing to spend them on yet
- Sound effects and more worlds on the map
