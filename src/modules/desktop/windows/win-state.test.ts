import { describe, expect, it } from 'vitest';
import { maximizedShape, type Placement, transition } from './win-state';

const RECT = { x: 40, y: 30, w: 480, h: 340 };
const normal = (): Placement => ({
  state: 'normal',
  rect: { ...RECT },
  prev: null,
  restoreState: 'normal',
  autoMax: false,
});

describe('window state transitions', () => {
  it('maximize remembers the rect, restore brings it back', () => {
    const max = transition(normal(), 'max');
    expect(max).toMatchObject({ state: 'max', prev: RECT, autoMax: false });
    expect(maximizedShape(max)).toBe(true);
    const back = transition(max, 'normal');
    expect(back).toMatchObject({ state: 'normal', rect: RECT, autoMax: false });
    expect(maximizedShape(back)).toBe(false);
  });

  it('the remembered rect is a copy: moving the window later does not change it', () => {
    const start = normal();
    const max = transition(start, 'max');
    start.rect.x = 999;
    expect(max.prev).toEqual(RECT);
  });

  it('minimize remembers the state to come back to', () => {
    const min = transition(normal(), 'min');
    expect(min).toMatchObject({ state: 'min', restoreState: 'normal' });
    expect(transition(min, min.restoreState).state).toBe('normal');
  });

  it('a maximized window comes back maximized, with its restore rect intact', () => {
    const min = transition(transition(normal(), 'max'), 'min');
    expect(min).toMatchObject({ state: 'min', restoreState: 'max', prev: RECT });
    expect(maximizedShape(min)).toBe(true);
    const back = transition(min, min.restoreState);
    expect(back).toMatchObject({ state: 'max', prev: RECT });
    expect(transition(back, 'normal').rect).toEqual(RECT);
  });

  it('a transition to the current state changes nothing', () => {
    const p = normal();
    expect(transition(p, 'normal')).toBe(p);
    const max = transition(p, 'max');
    expect(transition(max, 'max', true)).toBe(max);
  });

  describe('maximized by the phone layout', () => {
    it('is marked, and survives a trip to the taskbar', () => {
      const auto = transition(normal(), 'max', true);
      expect(auto.autoMax).toBe(true);
      const back = transition(transition(auto, 'min'), 'max');
      expect(back.autoMax).toBe(true);
    });

    it('is not marked on a window the visitor maximized', () => {
      const own = transition(transition(transition(normal(), 'max'), 'min'), 'max');
      expect(own.autoMax).toBe(false);
    });

    it('is cleared by every way back to normal (Restore, Cascade, Tile)', () => {
      expect(transition(transition(normal(), 'max', true), 'normal').autoMax).toBe(false);
    });
  });
});
