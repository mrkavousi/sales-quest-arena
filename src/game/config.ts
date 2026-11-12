/**
 * Tunable game configuration.
 * Everything a game designer may want to tweak lives here —
 * later this object can be served by an admin/back-office API.
 */
export const GAME_CONFIG = {
  rewards: {
    missionXp: 100,
    missionCoins: 20,
    dailyBonusXp: 50,
    orderBonusXp: 30,
  },
  /** XP needed to reach each level (index 0 = level 1). */
  levels: [
    { level: 1, title: 'Rookie', minXp: 0, color: '#8b93b8' },
    { level: 2, title: 'Explorer', minXp: 150, color: '#2ea8ff' },
    { level: 3, title: 'Challenger', minXp: 400, color: '#2fbf71' },
    { level: 4, title: 'Performer', minXp: 800, color: '#ff8a3d' },
    { level: 5, title: 'Champion', minXp: 1400, color: '#ffb020' },
  ],
  history: {
    /** Keep the save file small; oldest entries beyond this are dropped. */
    maxEntries: 200,
  },
} as const;
