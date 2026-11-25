import { describe, expect, it } from 'vitest';
import { boxOnGlass, pageOnGlass } from './desk-snapshot';

// a 16:9 glass painted on a 1024 x 576 canvas
const A = 16 / 9;
const CW = 1024;
const CH = 576;

describe('the page on the glass', () => {
  it('fills a glass of its own proportions', () => {
    expect(pageOnGlass(1280, 720, CW, CH, A)).toEqual({ x: 0, y: 0, w: 1024, h: 576, s: 0.8 });
  });
  it('keeps the page proportions and stays centred, whatever the window', () => {
    for (const [W, H] of [
      [1280, 800],
      [390, 844],
      [2560, 1080],
      [1024, 1024],
    ] as const) {
      const fit = pageOnGlass(W, H, CW, CH, A);
      expect(fit.w / fit.h).toBeCloseTo(W / H);
      expect(fit.x * 2 + fit.w).toBeCloseTo(CW);
      expect(fit.y * 2 + fit.h).toBeCloseTo(CH);
      expect(fit.w).toBeLessThanOrEqual(CW + 1e-9);
      expect(fit.h).toBeLessThanOrEqual(CH + 1e-9);
    }
  });
  it('sits at the left edge of a glass that is too wide for it, when asked (a phone flies to the icons)', () => {
    const centred = pageOnGlass(390, 844, CW, CH, A);
    const fit = pageOnGlass(390, 844, CW, CH, A, 'left');
    expect(fit).toEqual({ ...centred, x: 0 });
  });
  it('fills a glass of its own proportions or one too tall for it wherever it is asked to sit', () => {
    expect(pageOnGlass(1280, 720, CW, CH, A, 'left')).toEqual(pageOnGlass(1280, 720, CW, CH, A));
    expect(pageOnGlass(2000, 800, CW, CH, A, 'left')).toEqual(pageOnGlass(2000, 800, CW, CH, A));
  });
  it('maps page boxes into the canvas', () => {
    const fit = pageOnGlass(390, 844, CW, CH, A);
    // the whole page is the fitted part; the taskbar sits at its bottom edge
    expect(boxOnGlass(fit, { x: 0, y: 0, w: 390, h: 844 })).toEqual([fit.x, fit.y, fit.w, fit.h]);
    const [x, y, w, h] = boxOnGlass(fit, { x: 0, y: 814, w: 390, h: 30 });
    expect(x).toBe(fit.x);
    expect(w).toBeCloseTo(fit.w);
    expect(y + h).toBeCloseTo(CH);
  });
});
