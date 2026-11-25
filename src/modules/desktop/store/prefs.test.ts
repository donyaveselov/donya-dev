import { describe, expect, it } from 'vitest';
import { defaultPrefs, legacyMuted, parsePrefs } from './prefs';

describe('saved preferences', () => {
  it('are the defaults when nothing usable was stored', () => {
    for (const raw of [undefined, null, 'bliss', 42, [], () => 0]) expect(parsePrefs(raw)).toEqual(defaultPrefs());
  });

  it('keep every well-formed field', () => {
    const saved = {
      volume: 0.35,
      wall: 'autumn',
      crt: false,
      saver: 'stars',
      saverMin: 10,
      icons: { projects: [0, 0], recycle: [3, 2] },
      autoArrange: true,
    };
    expect(parsePrefs(saved)).toEqual(saved);
  });

  it('fall back field by field, keeping the good ones', () => {
    const p = parsePrefs({ volume: 'loud', wall: 7, crt: false, saver: 'matrix', saverMin: null });
    expect(p).toEqual({ ...defaultPrefs(), crt: false });
  });

  it('bring numbers into range', () => {
    expect(parsePrefs({ volume: 7 }).volume).toBe(1);
    expect(parsePrefs({ volume: -1 }).volume).toBe(0);
    expect(parsePrefs({ volume: NaN }).volume).toBe(defaultPrefs().volume);
    expect(parsePrefs({ saverMin: 0 }).saverMin).toBe(1);
    expect(parsePrefs({ saverMin: 999 }).saverMin).toBe(60);
    expect(parsePrefs({ saverMin: 2.6 }).saverMin).toBe(3);
  });

  it('drop icon positions that are not grid cells', () => {
    const icons = {
      ok: [1, 2],
      short: [1],
      long: [1, 2, 3],
      text: ['a', 'b'],
      negative: [-1, 0],
      half: [0.5, 1],
      no: 5,
    };
    expect(parsePrefs({ icons }).icons).toEqual({ ok: [1, 2] });
    expect(parsePrefs({ icons: [[0, 0]] }).icons).toEqual({});
  });

  it('drop keys the shell no longer keeps there', () => {
    expect(parsePrefs({ muted: true, theme: 'luna', tint: false })).toEqual(defaultPrefs());
  });

  it('give each caller its own defaults', () => {
    parsePrefs(null).icons.projects = [5, 5];
    expect(parsePrefs(null).icons).toEqual({});
  });
});

describe('the mute a desktop stored before the page had one switch', () => {
  it('is read from the old prefs', () => {
    expect(legacyMuted({ muted: true })).toBe(true);
    expect(legacyMuted({ muted: false })).toBe(false);
    expect(legacyMuted({ muted: 'true' })).toBe(false);
    expect(legacyMuted({})).toBe(false);
    expect(legacyMuted(undefined)).toBe(false);
  });
});
