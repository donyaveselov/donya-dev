import { describe, expect, it } from 'vitest';
import { formatClock, statusAt, timeOfDayAt } from './time';

describe('shell clock', () => {
  it('formats the taskbar clock per language', () => {
    expect(formatClock({ h: 13, m: 5 }, 'ru')).toBe('13:05');
    expect(formatClock({ h: 13, m: 5 }, 'en')).toBe('1:05 PM');
    expect(formatClock({ h: 0, m: 30 }, 'en')).toBe('12:30 AM');
    expect(formatClock({ h: 12, m: 0 }, 'en')).toBe('12:00 PM');
  });
  it("guesses the owner's status from the hour", () => {
    expect([7, 8, 18, 19, 22, 23].map(statusAt)).toEqual(['sleep', 'work', 'work', 'play', 'play', 'sleep']);
  });
  it('tints the wallpaper by the time of day', () => {
    expect(timeOfDayAt({ h: 6, m: 30 })).toBe('day');
    expect(timeOfDayAt({ h: 17, m: 29 })).toBe('day');
    expect(timeOfDayAt({ h: 17, m: 30 })).toBe('dusk');
    expect(timeOfDayAt({ h: 19, m: 15 })).toBe('night');
    expect(timeOfDayAt({ h: 5, m: 45 })).toBe('dusk');
    expect(timeOfDayAt({ h: 3, m: 0 })).toBe('night');
  });
});
