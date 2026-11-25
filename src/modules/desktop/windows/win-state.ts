// A window's state machine, DOM-free: normal, maximized or minimized, and what it remembers to come back
// (unit-tested in win-state.test.ts).
import type { Rect } from './layout';

export type WinState = 'normal' | 'max' | 'min';

export interface Placement {
  state: WinState;
  /** The window's own rect; a maximized or minimized window keeps it for the way back. */
  rect: Rect;
  /** The rect to restore from maximized. */
  prev: Rect | null;
  /** The state to restore from minimized. */
  restoreState: WinState;
  /** Maximized by the phone layout, not by the visitor: undone when the screen gets wider. */
  autoMax: boolean;
}

/** The placement after moving to `next`. `byLayout` marks a maximize made by the phone layout. */
export function transition(p: Placement, next: WinState, byLayout = false): Placement {
  const from = p.state;
  if (next === from) return p;
  if (next === 'min') return { ...p, state: 'min', restoreState: from };
  if (next === 'max')
    return {
      ...p,
      state: 'max',
      prev: from === 'normal' ? { ...p.rect } : p.prev,
      // back from the taskbar it is still the layout's maximize
      autoMax: byLayout || (from === 'min' && p.autoMax),
    };
  return { ...p, state: 'normal', rect: from === 'max' && p.prev ? p.prev : p.rect, autoMax: false };
}

/** Whether the window has the maximized shape: a minimized one keeps the shape it will come back in. */
export const maximizedShape = (p: Pick<Placement, 'state' | 'restoreState'>): boolean =>
  (p.state === 'min' ? p.restoreState : p.state) === 'max';
