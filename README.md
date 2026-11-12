# Sales Quest Arena

A small, playable gamification MVP for sales reps and field agents.
It is a **game** that happens to record self-reported sales activities — not a CRM dashboard.
The server integration is a prototype: game XP and coins are sample values, separate
from organizational points, and an in-game order is not verified sales evidence.

## Run it

```bash
npm install
npm start          # production build + server on http://localhost:4173
npm run dev        # dev server with hot reload on http://localhost:5173
npm test           # game-engine and localization unit tests
npm run build:standalone   # one self-contained file: standalone/index.html

# With npm start running in another terminal:
npx playwright install chromium
npm run test:e2e    # English/Persian playthroughs, Tribal scaffold and PWA checks
npm run test:tribal # default-off preview + temporary flag-on production build
npm run test:pwa    # builds and tests installability, offline play and updates

# Cross-repository integration test (fresh temporary demo database):
SQA_BACKEND_DIR=../comu-center SQA_BACKEND_PYTHON=../comu-center/.venv/bin/python npm run test:bff
```

The device-only game is the default and needs no backend. To run the server-backed
demo with the current `iciiex/comu-center` BFF, see [BFF integration](docs/bff-integration.md)
for setup, same-origin proxy requirements, data boundaries, and security limitations.

Stack: React 18 + TypeScript + Vite. No UI kit, no animation library, no 3D engine —
animations are CSS plus a ~100-line canvas confetti. Illustrations are original inline SVG.

## Deploy to Vercel

Import the GitHub repository into a Vercel project and deploy the branch containing
these changes. `vercel.json` configures the Vite build (`npm ci`, `npm run build`,
output directory `dist`); the default device-only game requires no backend. Hash-based
navigation does not need a catch-all rewrite. Vercel normally uses the configured
production branch for the production URL and other branches for previews.

**The Vercel configuration does not provide a backend proxy.** Server mode works only
when an explicitly configured same-origin reverse proxy routes the API and demo-login
paths to a compatible backend. Do not expose the demo login publicly; see the
[deployment and security notes](docs/bff-integration.md#deployment-and-security).
Device-only progress and the language preference remain scoped to the site's origin;
server progress belongs to the signed-in demo account and is separate.

## Optional Tribal overview scaffold

The read-only Tribal entry is **off by default**, including in production. To enable
its presentation when building or running Vite, set `VITE_TRIBAL_ENABLED=true` (for
example, `VITE_TRIBAL_ENABLED=true npm run dev` or `VITE_TRIBAL_ENABLED=true npm run build`).
This public build flag is **not authorization**. The enabled page only shows a neutral
not-connected state: it does not call a Tribal API, use the demo account, contain sample
standings, submit reports or award points. View-model fixtures are restricted to tests.

The shell keeps the game mounted and does not use or change game progress. The existing
game provider still follows its normal local/server behavior in the background. A player
must finish or save and exit a mission, and close an open game dialog, before opening
the overview. The view model is a UI boundary, not an API contract or security policy;
a future backend must authorize and filter all data before it reaches the browser. In
tests, a player field is displayed only when its visibility flag is explicitly `true`.
The nested presentation renders all supplied levels, while capping visual indentation
to keep deep hierarchies readable on narrow screens.

## Install and play offline

The HTTPS deployment is an installable progressive web app (PWA); no app store or APK
is required. On Android, open the production URL in Chrome and tap **Install the game**,
or use Chrome's three-dot menu → **Install app / Add to Home screen**. On iPhone/iPad,
open it in Safari, tap **Share** → **Add to Home Screen** → **Add**. Browser and OS
versions can use slightly different menu labels. Installation is available on HTTPS
or localhost, not when opening the standalone HTML file directly.

After the first complete online visit, the cached shell, translations, fonts and
icons support the **device-only** game offline. Its progress stays on the device;
clearing site/app storage or uninstalling may delete it, and some platforms keep an
installed app's storage separate from a browser tab. There is no automatic import,
cloud sync, or backup of that local game.

**Server mode requires a connection** for profile, draft and completion writes. No
server-mode offline queue or automatic synchronization exists. When a completion
response is lost, a per-account retry record allows the player to explicitly retry
the exact same request; it is not a confirmed reward. API and login responses are
network-only and never cached by the service worker.

A new release is downloaded in the background and waits until the player chooses to
update or closes the old app. The update notice is postponed during a mission. The
regular Vite build generates `dist/sw.js` with a content-based revision and precaches
the built assets; the single-file build remains self-contained and does not register a
service worker. `npm run test:pwa` checks installability and offline behavior using
Chromium and simulates Android/iOS install flows and a safe update.

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

### Sample game rules (not approved business policy)

Device-only mode uses `src/game/config.ts`; server mode uses the versioned config
received from the BFF. These values do not create organizational points.

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
    storage.ts          Device-only persistence (localStorage, verified writes)
    engine.test.ts      Local rules unit tests
  api/                  Same-origin BFF client, error handling and completion retry records
  i18n/                 English/Persian UI strings, translated game content and locale helpers
    LanguageContext.tsx Language preference, document language and direction
    locale.test.ts      Translation coverage, formatting and save-compatibility tests
  pwa/PwaContext.tsx    Install prompt, service-worker registration and update handling
  state/GameContext.tsx Device-only store and explicit mode selection
  state/ServerGameContext.tsx Async bootstrap, ordered writes and server projections
  router.ts             Tiny hash router
  components/           PlayerHeader, MissionMap, MissionCard, MissionDetail, DailyChallenge,
                        PlayerProgress, AchievementBadge, AppLayout
    play/               MissionGameplay, MissionStep, MissionResult, RewardAnimation
    art/                Avatar, Mascot ("Pip"), MissionArt, Scenery
    ui/                 Icon, Progress, Sheet, Confetti, motion helpers
  pages/                Welcome, Arena, Missions, History, Profile, Play/Result
  styles/               tokens.css (design system) + one stylesheet per area
```

In device-only mode, mission status and rewards are calculated locally. In server
mode, the BFF owns the catalog, mission status, rewards, progress and UTC `date_key`;
the browser sends answers only and displays server-returned projections.

### Persistence

The old device-only save remains in `localStorage` under
`sales-quest-arena:progress:v1`. It is neither deleted nor imported as server XP.
Verified local writes report a warning when storage is unavailable. A separate mode
preference selects the device-only or server game. Server mode keeps a single
per-account completion retry record (answers and idempotency key, **no session
or CSRF token**) so an ambiguous response can be retried explicitly. Clearing browser
storage removes that recovery record; check server history before starting a new run
if a prior result was uncertain. Full details are in [BFF integration](docs/bff-integration.md).

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

**Add a local-only mission** — append an object to `MISSIONS` in `src/game/missions.ts`:

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
Unknown content falls back to its original text rather than affecting gameplay. In
server mode, update the backend catalog, its content version, client compatibility
check and contract tests together; changing this local array does not change the BFF.

**Add a reward rule** — append to `REWARD_RULES` in `src/game/rewards.ts` and translate its ID in `PERSIAN_REWARDS`.
**Add a badge** — append to `ACHIEVEMENTS` in `src/game/achievements.ts` and translate its ID in `PERSIAN_ACHIEVEMENTS`.
**Add a step type** (photo, number, location…) — add it to the `MissionStep` union in
`types.ts` and a view in `components/play/MissionStep.tsx`.

## Not built yet (Phase 3)

- Production authentication and a production-safe same-origin BFF deployment
- Server-mode offline write queue or automatic sync; migration of old local XP
- Real sales data (CRM visits/orders completing missions automatically)
- Team competitions and leaderboards
- Admin mission configuration (serve `MISSIONS` and `GAME_CONFIG` from an API)
- A coin shop — coins are earned and stored, but there is nothing to spend them on yet
- Sound effects and more worlds on the map
