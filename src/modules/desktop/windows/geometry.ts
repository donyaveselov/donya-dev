// Coordinates inside the desktop. The room may CSS-scale the desktop's root (it sits on a 3D monitor), so pointer and
// element positions are converted into the root's own, unscaled pixels.
import { TINY_W } from '../store/constants';
import type { Rect } from './layout';
import { dom, S } from '../store/state';

export interface Pt {
  x: number;
  y: number;
}

function rootScale(): { x: number; y: number; l: number; t: number } {
  const root = dom().root;
  const r = root.getBoundingClientRect();
  return {
    x: r.width / (root.offsetWidth || 1) || 1,
    y: r.height / (root.offsetHeight || 1) || 1,
    l: r.left,
    t: r.top,
  };
}

type ClientPt = Pick<MouseEvent, 'clientX' | 'clientY'>;

export function localPt(e: ClientPt): Pt {
  const s = rootScale();
  return { x: (e.clientX - s.l) / s.x, y: (e.clientY - s.t) / s.y };
}

/** localPt for one pointer gesture: the root is measured once, not on every pointermove. */
export function gesturePt(): (e: ClientPt) => Pt {
  const s = rootScale();
  return (e) => ({ x: (e.clientX - s.l) / s.x, y: (e.clientY - s.t) / s.y });
}

/**
 * Follows a pointer from its press to its release (or cancel): captures it on `el` and reports how far it is from the
 * press, in the desktop's pixels.
 */
export function trackPointer(
  el: HTMLElement,
  down: PointerEvent,
  onMove: (dx: number, dy: number) => void,
  onEnd: () => void,
): void {
  const pt = gesturePt();
  const p = pt(down);
  try {
    el.setPointerCapture(down.pointerId);
  } catch {
    /* the pointer is already gone */
  }
  const move = (e: PointerEvent): void => {
    const q = pt(e);
    onMove(q.x - p.x, q.y - p.y);
  };
  const end = (): void => {
    el.removeEventListener('pointermove', move);
    el.removeEventListener('pointerup', end);
    el.removeEventListener('pointercancel', end);
    onEnd();
  };
  el.addEventListener('pointermove', move);
  el.addEventListener('pointerup', end);
  el.addEventListener('pointercancel', end);
}

export function localRect(el: Element): Rect {
  const s = rootScale();
  const r = el.getBoundingClientRect();
  return { x: (r.left - s.l) / s.x, y: (r.top - s.t) / s.y, w: r.width / s.x, h: r.height / s.y };
}

/** The work area: the desktop above the taskbar. */
export function work(): { w: number; h: number } {
  const desk = dom().desk;
  return { w: desk.clientWidth || S.w, h: desk.clientHeight || S.h };
}

export const isPhone = (): boolean => S.size === 'phone';
/** Too narrow for a floating context menu. */
export const isTiny = (): boolean => S.w < TINY_W;
