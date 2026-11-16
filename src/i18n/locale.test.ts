import { describe, expect, it } from 'vitest';
import { getMission } from '../game/missions';
import { localizeMission } from './content';
import { formatNumber, LANGUAGE_STORAGE_KEY, resolveLanguage, translate } from './locale';
import { EN, FA, type MessageKey } from './messages';

const placeholders = (text: string) => [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

describe('language resolution', () => {
  it('prefers a saved choice over the browser language', () => {
    expect(resolveLanguage('en', ['fa-IR'])).toBe('en');
    expect(resolveLanguage('fa', ['en-US'])).toBe('fa');
    expect(LANGUAGE_STORAGE_KEY).toBe('sales-quest-arena:language:v1');
  });

  it('falls back to the first supported browser language, then English', () => {
    expect(resolveLanguage(null, ['fr-FR', 'fa-IR'])).toBe('fa');
    expect(resolveLanguage(null, ['de-DE'])).toBe('en');
    expect(resolveLanguage('xx', [])).toBe('en');
  });
});

describe('translations', () => {
  it('interpolates named placeholders and keeps unknown ones visible', () => {
    expect(translate('en', 'k.rd.rankOf', { position: 3, of: 8 })).toBe('Rank 3 of 8');
    expect(translate('fa', 'k.rd.rankOf', { position: 3, of: 8 })).toBe('رتبه ۳ از ۸');
    expect(translate('en', 'k.rd.rankOf', { position: 3 })).toContain('{of}');
  });

  it('gives every key the same placeholders in English and Persian', () => {
    for (const key of Object.keys(EN) as MessageKey[]) {
      expect(placeholders(FA[key]), key).toEqual(placeholders(EN[key]));
    }
  });

  it('has a Persian text for every key', () => {
    for (const key of Object.keys(EN) as MessageKey[]) {
      expect(FA[key].trim().length, key).toBeGreaterThan(0);
    }
  });

  it('formats numbers with Persian digits only in Persian', () => {
    expect(formatNumber('en', 120)).toBe('120');
    expect(formatNumber('fa', 120)).toBe('۱۲۰');
  });
});

describe('mission copy', () => {
  const mission = getMission('product-spotlight');

  it('returns the original catalogue text in English', () => {
    expect(mission).toBeDefined();
    expect(localizeMission(mission!, 'en')).toBe(mission);
  });

  it('returns Persian title and keeps ids and rewards unchanged', () => {
    const fa = localizeMission(mission!, 'fa');
    expect(fa.title).not.toBe(mission!.title);
    expect(fa.id).toBe(mission!.id);
    expect(fa.xpReward).toBe(mission!.xpReward);
    expect(fa.steps.map((s) => s.id)).toEqual(mission!.steps.map((s) => s.id));
  });
});
