import { Color } from 'three';
import { describe, expect, it } from 'vitest';
import { lampsOff, roomLight, skyColours, skyFactors } from './lighting';

describe('lighting', () => {
  it('day and dusk follow the hour; asleep is always night', () => {
    expect(skyFactors(13, false)).toEqual({ day: 1, dusk: 0 });
    expect(skyFactors(1.5, false).day).toBe(0);
    expect(skyFactors(18.3, false).dusk).toBe(1);
    expect(skyFactors(13, true)).toEqual({ day: 0, dusk: 0 });
  });
  it('is the work light by day and the lamp light at night', () => {
    expect(lampsOff(13)).toBe(1);
    expect(lampsOff(21)).toBe(0);
    const day = roomLight('work', 13, 1);
    expect(day.sky).toBe(0xfff4dc);
    expect(day.lamps).toEqual([0.55, 0.5]);
    expect(day.win).toBeCloseTo(0.15);
    const night = roomLight('outside', 21, 0);
    expect(night.sky).toBe(0x5a6af0);
    expect(night.lamps).toEqual([2, 1.8]);
    expect(night.winCol).toBeNull();
    const asleep = roomLight('sleep', 13, 0);
    expect(asleep.scr).toBe(6);
    expect(asleep.winCol).toBe(0x3a66ff);
  });
  it('greys the window sky when overcast', () => {
    const top = new Color();
    const low = new Color();
    skyColours({ day: 1, dusk: 0 }, 0, top, low);
    expect(top.getHex()).toBe(0x1e8fe8);
    expect(low.getHex()).toBe(0xa8e6ff);
    skyColours({ day: 1, dusk: 0 }, 1, top, low);
    expect(top.getHexString()).not.toBe('1e8fe8');
  });
});
