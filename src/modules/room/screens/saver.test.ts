import { describe, expect, it } from 'vitest';
import { bounce, saverPos } from './saver';

describe('the floating logo', () => {
  it('bounces between 0 and the span', () => {
    expect(bounce(0, 10)).toBe(0);
    expect(bounce(7, 10)).toBe(7);
    expect(bounce(13, 10)).toBe(7);
    expect(bounce(20, 10)).toBe(0);
    expect(bounce(-3, 10)).toBe(3);
  });
  it('stays inside its free travel and fills the given object', () => {
    const out = { u: -1, v: -1 };
    for (let t = 0; t < 200; t += 0.37) {
      const p = saverPos(t, out);
      expect(p).toBe(out);
      expect(p.u).toBeGreaterThanOrEqual(0);
      expect(p.u).toBeLessThanOrEqual(1);
      expect(p.v).toBeGreaterThanOrEqual(0);
      expect(p.v).toBeLessThanOrEqual(1);
    }
    expect(saverPos(0)).toEqual({ u: 40 / 518, v: 25 / 354 });
    // 46 px/s across a 518 px span: the far edge after (518 - 40) / 46 s, then back
    expect(saverPos((518 - 40) / 46).u).toBeCloseTo(1);
    expect(saverPos((2 * 518 - 40) / 46).u).toBeCloseTo(0);
  });
});
