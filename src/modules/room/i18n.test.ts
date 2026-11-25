import { describe, expect, it } from 'vitest';
import { isAriaKey, isMarkupKey, t, timeChip, tourLine } from './i18n';

describe('room i18n', () => {
  it('has the same keys in both languages', () => {
    const keys = (o: object): string[] =>
      Object.entries(o)
        .flatMap(([k, v]) => (typeof v === 'object' && v ? keys(v as object).map((x) => k + '.' + x) : [k]))
        .sort();
    expect(keys(t('en'))).toEqual(keys(t('ru')));
  });
  it('writes the time chip', () => {
    expect(timeChip('ru', 9, 5, 'work', null)).toBe('Пхукет 09:05 · работаю');
    expect(timeChip('ru', 21, 30, 'play', 'Dota 2')).toBe('Пхукет 21:30 · играю в Dota 2');
    expect(timeChip('en', 21, 30, 'play', 'Dota 2')).toBe('Phuket 21:30 · gaming Dota 2');
  });
  it('fills in the greeting', () => {
    expect(tourLine('en', 'hello', { h: 13, m: 0, status: 'work', gameName: null })).toBe(
      'Hi, I’m Daniil! It’s 13:00 in Phuket and I’m working. Want a quick tour of the room?',
    );
    expect(tourLine('en', 'end', { h: 13, m: 0, status: 'work', gameName: null })).toBe(t('en').tour.end);
  });
  it('knows the markup keys', () => {
    expect(isMarkupKey('loading')).toBe(true);
    expect(isMarkupKey('tour')).toBe(false);
    expect(isMarkupKey(null)).toBe(false);
    expect(isMarkupKey('no3d')).toBe(true);
    expect(isAriaKey('lang')).toBe(true);
    expect(isAriaKey('loading')).toBe(false);
  });
});
