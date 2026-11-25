import { describe, expect, it } from 'vitest';
import { phuketTime, statusAt } from './clock';

const at = (h: number, m = 0) => ({ h, m });

describe('phuketTime', () => {
  it('is UTC+7', () => {
    expect(phuketTime(new Date('2026-11-24T06:00:00Z'), null)).toEqual({ h: 13, m: 0 });
    expect(phuketTime(new Date('2026-11-24T17:05:00Z'), null)).toEqual({ h: 0, m: 5 });
  });
  it('takes a previewed hour as hours and minutes', () => {
    const now = new Date('2026-11-24T06:00:00Z');
    expect(phuketTime(now, 18.2)).toEqual({ h: 18, m: 12 });
    expect(phuketTime(now, 1.5)).toEqual({ h: 1, m: 30 });
    expect(phuketTime(now, 19.3)).toEqual({ h: 19, m: 18 });
  });
});

describe('statusAt', () => {
  it('follows the daily schedule', () => {
    expect(statusAt(at(7, 59), null, null)).toBe('sleep');
    expect(statusAt(at(8), null, null)).toBe('outside');
    expect(statusAt(at(10), null, null)).toBe('work');
    expect(statusAt(at(18, 59), null, null)).toBe('work');
    expect(statusAt(at(19), null, null)).toBe('outside');
    expect(statusAt(at(20, 30), null, null)).toBe('play');
    expect(statusAt(at(23, 30), null, null)).toBe('sleep');
  });
  it('lets a forced status win, then a game being played', () => {
    const playing = { playing: true, game: 'Dota 2', kind: 'dota' } as const;
    expect(statusAt(at(13), 'sleep', playing)).toBe('sleep');
    expect(statusAt(at(13), null, playing)).toBe('play');
    expect(statusAt(at(3), null, playing)).toBe('play');
  });
  it('guesses "play" in the evening only without a presence reading', () => {
    expect(statusAt(at(21), null, null)).toBe('play');
    expect(statusAt(at(21), null, { playing: false, status: 'online' })).toBe('outside');
  });
});
