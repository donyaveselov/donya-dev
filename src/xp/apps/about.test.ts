import { describe, expect, it } from 'vitest';
import { hms, nextLoad } from './about-stats';

describe('My Computer stats', () => {
  it('formats the window uptime', () => {
    expect(hms(0)).toBe('00:00:00');
    expect(hms(3725)).toBe('01:02:05');
  });
  it('random-walks the focus graph inside the status range', () => {
    expect(nextLoad(undefined, [60, 100], 0.5)).toBe(80);
    expect(nextLoad(90, [60, 100], 1)).toBe(100);
    expect(nextLoad(61, [60, 100], 0)).toBe(60);
    expect(nextLoad(80, [60, 100], 0.75)).toBeCloseTo(86);
  });
});
