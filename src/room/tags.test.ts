import { describe, expect, it } from 'vitest';
import { separate, windowText } from './tags';
import type { Placed } from './tags';
import { newWeather } from './weather';

describe('the weather label', () => {
  it('says where I am without a reading', () => {
    expect(windowText('en', newWeather())).toBe('I’m in Phuket');
  });
  it('adds the weather and the temperature once a reading is in', () => {
    expect(windowText('en', { ...newWeather(), at: 1, kind: 'rain', temp: 29.6 })).toBe('I’m in Phuket · rain, 30°');
    expect(windowText('ru', { ...newWeather(), at: 1, kind: 'clear', temp: null })).toBe('Я на Пхукете · ясно');
  });
  it('shows a forced kind without a temperature', () => {
    expect(windowText('en', { ...newWeather(), forced: 'storm', temp: 31 })).toBe('I’m in Phuket · thunderstorm');
  });
});

const box = (p: Placed): [number, number, number, number] => [p.x - p.w / 2, p.y - p.h, p.x + p.w / 2, p.y];
const overlap = (a: Placed, b: Placed): boolean => {
  const [al, at, ar, ab] = box(a);
  const [bl, bt, br, bb] = box(b);
  return al < br && bl < ar && at < bb && bt < ab;
};

describe('label layout', () => {
  it('leaves labels that do not touch where they are', () => {
    const tags = [
      { x: 100, y: 100, w: 80, h: 30 },
      { x: 300, y: 100, w: 80, h: 30 },
    ];
    expect(
      separate(
        tags.map((x) => ({ ...x })),
        1000,
      ),
    ).toEqual(tags);
  });
  it('moves the higher of two colliding labels up, clear of the lower one', () => {
    const [low, high] = separate(
      [
        { x: 200, y: 300, w: 120, h: 34 },
        { x: 230, y: 290, w: 120, h: 34 },
      ],
      1000,
    ) as [Placed, Placed];
    expect(low).toEqual({ x: 200, y: 300, w: 120, h: 34 });
    expect(high.x).toBe(230);
    expect(high.y).toBeLessThanOrEqual(300 - 34);
    expect(overlap(low, high)).toBe(false);
  });
  it('untangles a pile of labels (the phone case)', () => {
    const tags = separate(
      [
        { x: 150, y: 420, w: 150, h: 34 },
        { x: 120, y: 450, w: 110, h: 34 },
        { x: 90, y: 470, w: 100, h: 34 },
        { x: 260, y: 440, w: 200, h: 34 },
      ],
      390,
    );
    tags.forEach((a, i) => {
      for (const b of tags.slice(i + 1)) expect(overlap(a, b)).toBe(false);
    });
  });
  it('keeps a label inside the window sideways', () => {
    const [l] = separate([{ x: 10, y: 200, w: 100, h: 30 }], 390) as [Placed];
    expect(l.x - l.w / 2).toBeGreaterThanOrEqual(0);
    const [r] = separate([{ x: 385, y: 200, w: 100, h: 30 }], 390) as [Placed];
    expect(r.x + r.w / 2).toBeLessThanOrEqual(390);
  });
});
