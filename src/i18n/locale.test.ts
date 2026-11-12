import { describe, expect, it } from 'vitest';
import { ACHIEVEMENTS } from '../game/achievements';
import { completeMission } from '../game/completeMission';
import { LEVELS } from '../game/levels';
import { collectFlags, MISSIONS, sanitizeAnswers } from '../game/missions';
import { createInitialProgress, ensureDaily, getMissionView } from '../game/progress';
import { REWARD_RULES } from '../game/rewards';
import type { Answers, MissionRecord } from '../game/types';
import { localizeAchievement, localizeMission, localizeMissionView, PERSIAN_ACHIEVEMENTS, PERSIAN_LEVELS, PERSIAN_MISSIONS, PERSIAN_REWARDS, rewardLabel } from './content';
import { formatCountdown, formatDayLabel, formatNumber, keyboardDigit, resolveLanguage, translate } from './locale';
import { EN, FA, type MessageKey } from './messages';

const placeholders = (text: string) => [...text.matchAll(/\{(\w+)\}/g)].map((match) => match[1]).sort();
const hasPersian = (text: string) => /[\u0600-\u06ff]/.test(text);

describe('language and formatting', () => {
  it('honors a saved preference before supported browser languages', () => {
    expect(resolveLanguage('fa', ['en-US'])).toBe('fa');
    expect(resolveLanguage('en', ['fa-IR'])).toBe('en');
    expect(resolveLanguage(null, ['fa-AF', 'en-US'])).toBe('fa');
    expect(resolveLanguage(null, ['de-DE', 'en-US', 'fa-IR'])).toBe('en');
    expect(resolveLanguage('invalid', ['de-DE'])).toBe('en');
  });

  it('formats Persian numbers, countdowns, dates and keyboard digits', () => {
    expect(formatNumber('fa', 1400)).toBe('۱۴۰۰');
    expect(formatNumber('en', 1400)).toBe('1400');
    expect(formatCountdown('fa', 3_660_000)).toBe('۱ ساعت و ۰۱ دقیقه');
    expect(formatCountdown('en', 65_000)).toBe('1m 05s');
    const now = new Date(2026, 10, 12, 12);
    expect(formatDayLabel('fa', now.toISOString(), now)).toBe('امروز');
    const yesterday = new Date(2026, 10, 11, 12);
    expect(formatDayLabel('fa', yesterday.toISOString(), now)).toBe('دیروز');
    expect(hasPersian(formatDayLabel('fa', new Date(2026, 10, 8, 12).toISOString(), now))).toBe(true);
    expect(formatDayLabel('fa', new Date(2024, 2, 20, 12).toISOString(), new Date(2024, 2, 25, 12))).toContain('۱ فروردین');
    expect(keyboardDigit('۵')).toBe(5);
    expect(keyboardDigit('٣')).toBe(3);
    expect(keyboardDigit('7')).toBe(7);
    expect(keyboardDigit('Enter')).toBeNaN();
  });

  it('provides all messages with the same interpolation parameters', () => {
    expect(Object.keys(FA).sort()).toEqual(Object.keys(EN).sort());
    for (const key of Object.keys(EN) as MessageKey[]) {
      expect(FA[key].length, key).toBeGreaterThan(0);
      expect(placeholders(FA[key]), key).toEqual(placeholders(EN[key]));
    }
    expect(translate('fa', 'common.levelTitle', { level: 2, title: 'کاوشگر' })).toBe('سطح ۲ · کاوشگر');
  });
});

describe('Persian game content', () => {
  it('covers every built-in mission, step, option, hint, rating and note', () => {
    expect(Object.keys(PERSIAN_MISSIONS).sort()).toEqual(MISSIONS.map((mission) => mission.id).sort());
    for (const original of MISSIONS) {
      const translated = localizeMission(original, 'fa');
      expect(hasPersian(translated.title), original.id).toBe(true);
      expect(hasPersian(translated.shortTitle), original.id).toBe(true);
      expect(hasPersian(translated.description), original.id).toBe(true);
      expect(Object.keys(PERSIAN_MISSIONS[original.id].steps).sort()).toEqual(original.steps.map((s) => s.id).sort());
      original.steps.forEach((step, index) => {
        const localized = translated.steps[index];
        expect(localized.id).toBe(step.id);
        expect(localized.type).toBe(step.type);
        expect(hasPersian(localized.label), `${original.id}/${step.id} label`).toBe(true);
        expect(hasPersian(localized.question), `${original.id}/${step.id} question`).toBe(true);
        if (step.helper) expect(hasPersian(localized.helper ?? ''), `${original.id}/${step.id} helper`).toBe(true);
        if (step.type === 'choice' && localized.type === 'choice') {
          expect(localized.options.map((option) => option.id)).toEqual(step.options.map((option) => option.id));
          step.options.forEach((option, optionIndex) => {
            const translation = localized.options[optionIndex];
            expect(hasPersian(translation.label), `${original.id}/${step.id}/${option.id} label`).toBe(true);
            if (option.hint) expect(hasPersian(translation.hint ?? ''), `${original.id}/${step.id}/${option.id} hint`).toBe(true);
            expect(translation.flags).toEqual(option.flags);
          });
        }
        if (step.type === 'rating' && localized.type === 'rating') {
          expect(localized.scale).toHaveLength(5);
          localized.scale.forEach((label) => expect(hasPersian(label)).toBe(true));
        }
        if (step.type === 'note' && localized.type === 'note') {
          expect(hasPersian(localized.placeholder)).toBe(true);
          expect(localized.suggestions?.length ?? 0).toBe(step.suggestions?.length ?? 0);
          localized.suggestions?.forEach((suggestion) => expect(hasPersian(suggestion)).toBe(true));
        }
      });
    }
  });

  it('keeps gameplay IDs, flags, rewards and persisted answers independent of language', () => {
    for (const mission of MISSIONS) {
      const original = JSON.stringify(mission);
      const translated = localizeMission(mission, 'fa');
      const answers: Answers = {};
      for (const step of mission.steps) {
        if (step.type === 'choice') answers[step.id] = step.options[0].id;
        if (step.type === 'rating') answers[step.id] = 5;
        if (step.type === 'note') answers[step.id] = 'یادداشت من';
      }
      expect(sanitizeAnswers(translated, answers)).toEqual(sanitizeAnswers(mission, answers));
      expect(collectFlags(translated, answers)).toEqual(collectFlags(mission, answers));
      expect(JSON.stringify(mission)).toBe(original);
      expect(localizeMission(mission, 'en')).toBe(mission);
    }
    const p = ensureDaily(createInitialProgress(new Date(2026, 0, 1, 12)), '2026-01-01');
    const { entry } = completeMission(p, MISSIONS[0].id, { customer_type: 'new', outcome: 'order_received', rating: 5, note: 'یادداشت من' }, new Date(2026, 0, 1, 12));
    expect(entry.rewards.xp).toBe(180);
    expect(entry.answers).toEqual({ customer_type: 'new', outcome: 'order_received', rating: 5, note: 'یادداشت من' });
    expect(rewardLabel(entry.rewards.lines[0], 'fa')).toBe('تکمیل مأموریت');
    expect(rewardLabel({ ruleId: 'custom', label: 'Custom reward', xp: 1, coins: 0 }, 'fa')).toBe('Custom reward');
  });

  it('translates every built-in badge, level, reward, and both kinds of unlock requirement', () => {
    expect(Object.keys(PERSIAN_ACHIEVEMENTS).sort()).toEqual(ACHIEVEMENTS.map((a) => a.id).sort());
    expect(Object.keys(PERSIAN_REWARDS).sort()).toEqual(REWARD_RULES.map((rule) => rule.id).sort());
    expect(Object.keys(PERSIAN_LEVELS).map(Number).sort()).toEqual(LEVELS.map((level) => level.level).sort());
    for (const achievement of ACHIEVEMENTS) {
      const localized = localizeAchievement(achievement, 'fa');
      expect(hasPersian(localized.title)).toBe(true);
      expect(hasPersian(localized.description)).toBe(true);
      expect(localized.isUnlocked).toBe(achievement.isUnlocked);
    }
    const progress = createInitialProgress();
    const spotlight = getMissionView(MISSIONS[1], progress, '2026-01-01');
    expect(localizeMissionView(spotlight, progress, 'fa').lockReason).toContain('چالش بازدید از مشتری');
    const record: MissionRecord = { completions: 1, firstCompletedAt: '', lastCompletedAt: '', bestRating: null };
    const withPreviousMission = { ...progress, missions: { 'follow-up-sprint': record } };
    const hunt = getMissionView(MISSIONS[3], withPreviousMission, '2026-01-01');
    expect(localizeMissionView(hunt, withPreviousMission, 'fa').lockReason).toContain('سطح ۲');
  });
});
