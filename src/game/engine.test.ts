import { describe, expect, it } from 'vitest';
import { completeMission, MissionError } from './completeMission';
import { getLevelInfo } from './levels';
import { CUSTOMER_VISIT_ID, MISSIONS } from './missions';
import { createInitialProgress, ensureDaily, getCurrentStreak, getMissionStatus, getMissionViews } from './progress';
import { normalizeProgress } from './storage';
import type { PlayerProgress } from './types';

const visit = MISSIONS.find((m) => m.id === CUSTOMER_VISIT_ID)!;
const spotlight = MISSIONS.find((m) => m.id === 'product-spotlight')!;
const day = (d: number, h = 10) => new Date(2026, 0, d, h, 0, 0);
const answers = (outcome = 'successful_meeting', rating = 4, note?: string) => ({
  customer_type: 'existing',
  outcome,
  rating,
  ...(note ? { note } : {}),
});
/** Fresh player whose daily challenge for Jan 1 is already assigned (to the visit mission). */
const fresh = (): PlayerProgress => ensureDaily(createInitialProgress(day(1)), '2026-01-01');

describe('levels', () => {
  it('maps XP to the configured levels', () => {
    expect(getLevelInfo(0).title).toBe('Rookie');
    expect(getLevelInfo(149).level).toBe(1);
    expect(getLevelInfo(150).title).toBe('Explorer');
    expect(getLevelInfo(400).title).toBe('Challenger');
    expect(getLevelInfo(800).title).toBe('Performer');
    expect(getLevelInfo(1400).title).toBe('Champion');
    expect(getLevelInfo(99999).isMax).toBe(true);
  });
  it('reports progress inside a level', () => {
    const info = getLevelInfo(275);
    expect(info.level).toBe(2);
    expect(info.xpIntoLevel).toBe(125);
    expect(info.xpForLevel).toBe(250);
    expect(info.progress).toBeCloseTo(0.5);
  });
});

describe('mission status', () => {
  it('starts with only the customer visit available', () => {
    const p = fresh();
    expect(getMissionStatus(visit, p)).toBe('available');
    expect(getMissionStatus(spotlight, p)).toBe('locked');
    expect(p.daily?.missionId).toBe(CUSTOMER_VISIT_ID);
  });
  it('is in progress while a draft exists', () => {
    const p = { ...fresh(), drafts: { [visit.id]: { missionId: visit.id, stepIndex: 2, answers: {}, startedAt: '' } } };
    expect(getMissionStatus(visit, p)).toBe('in_progress');
    expect(getMissionViews(p, '2026-01-01')[0].draftProgress).toBe(0.5);
  });
});

describe('completeMission', () => {
  it('rejects incomplete or locked runs', () => {
    expect(() => completeMission(fresh(), visit.id, { customer_type: 'existing' }, day(1))).toThrow(MissionError);
    expect(() => completeMission(fresh(), visit.id, { ...answers(), rating: 9 }, day(1))).toThrow(MissionError);
    expect(() => completeMission(fresh(), visit.id, { ...answers(), outcome: 'hacked' }, day(1))).toThrow(MissionError);
    expect(() => completeMission(fresh(), spotlight.id, { showcase: 'bundle', reaction: 'curious', rating: 3 }, day(1))).toThrow(MissionError);
  });

  it('awards 100 XP + 50 daily bonus and 20 coins on the first daily run', () => {
    const { progress, entry } = completeMission(fresh(), visit.id, answers(), day(1));
    expect(entry.rewards.xp).toBe(150);
    expect(entry.rewards.coins).toBe(20);
    expect(entry.wasDaily).toBe(true);
    expect(progress.xp).toBe(150);
    expect(progress.coins).toBe(20);
    expect(entry.levelBefore).toBe(1);
    expect(entry.levelAfter).toBe(2);
    expect(progress.daily?.completed).toBe(true);
    expect(getMissionStatus(visit, progress)).toBe('completed');
    expect(getMissionStatus(spotlight, progress)).toBe('available');
    expect(progress.history).toHaveLength(1);
    expect(entry.achievementsUnlocked).toEqual(expect.arrayContaining(['first_steps', 'daily_hero', 'explorer']));
  });

  it('adds the order bonus and gives the daily bonus only once per day', () => {
    const first = completeMission(fresh(), visit.id, answers('order_received', 5, '  big order  '), day(1));
    expect(first.entry.rewards.xp).toBe(180);
    expect(first.entry.answers.note).toBe('big order');
    expect(first.entry.achievementsUnlocked).toEqual(expect.arrayContaining(['deal_maker', 'five_star']));

    const second = completeMission(first.progress, visit.id, answers(), day(1, 15));
    expect(second.entry.wasDaily).toBe(false);
    expect(second.entry.rewards.xp).toBe(100);
    expect(second.progress.xp).toBe(280);
    expect(second.progress.coins).toBe(40);
    expect(second.progress.missions[visit.id].completions).toBe(2);
    expect(second.progress.missions[visit.id].bestRating).toBe(5);
    expect(second.progress.history[0].id).toBe(second.entry.id);
  });

  it('clears the draft of the completed mission', () => {
    const p = { ...fresh(), drafts: { [visit.id]: { missionId: visit.id, stepIndex: 3, answers: answers(), startedAt: '' } } };
    expect(completeMission(p, visit.id, answers(), day(1)).progress.drafts[visit.id]).toBeUndefined();
  });
});

describe('streak', () => {
  it('grows on consecutive days, holds within a day and resets after a gap', () => {
    let p = completeMission(fresh(), visit.id, answers(), day(1)).progress;
    expect(p.streak.count).toBe(1);
    p = completeMission(p, visit.id, answers(), day(1, 18)).progress;
    expect(p.streak.count).toBe(1);
    p = completeMission(p, visit.id, answers(), day(2)).progress;
    p = completeMission(p, visit.id, answers(), day(3)).progress;
    expect(p.streak.count).toBe(3);
    expect(p.achievements.on_fire).toBeTruthy();
    expect(getCurrentStreak(p, '2026-01-04')).toBe(3);
    expect(getCurrentStreak(p, '2026-01-05')).toBe(0);
    p = completeMission(p, visit.id, answers(), day(6)).progress;
    expect(p.streak.count).toBe(1);
    expect(p.streak.best).toBe(3);
  });
});

describe('persistence format', () => {
  it('survives a JSON round trip', () => {
    const { progress } = completeMission(fresh(), visit.id, answers('order_received', 5, 'hello'), day(1));
    expect(normalizeProgress(JSON.parse(JSON.stringify(progress)))).toEqual(progress);
  });
  it('rejects garbage', () => {
    expect(normalizeProgress(null)).toBeNull();
    expect(normalizeProgress({ version: 99 })).toBeNull();
    expect(normalizeProgress('nope')).toBeNull();
  });
});

describe('full playthrough', () => {
  it('can unlock and finish every mission on the map', () => {
    let p = fresh();
    MISSIONS.forEach((m, i) => {
      const a: Record<string, string | number> = {};
      for (const s of m.steps) {
        if (s.type === 'choice') a[s.id] = s.options[0].id;
        if (s.type === 'rating') a[s.id] = 4;
      }
      p = completeMission(p, m.id, a, day(1 + i)).progress;
    });
    expect(getMissionViews(p, '2026-01-07').every((v) => v.status === 'completed')).toBe(true);
    expect(p.achievements.trailblazer).toBeTruthy();
    expect(p.history).toHaveLength(MISSIONS.length);
  });
});
