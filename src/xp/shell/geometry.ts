// Coordinates inside the desktop. The room may CSS-scale the desktop's root (it sits on a 3D monitor), so pointer and
// element positions are converted into the root's own, unscaled pixels.
import type { Rect } from './layout';
import { dom, S } from './state';

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

export function localPt(e: { clientX: number; clientY: number }): Pt {
  const s = rootScale();
  return { x: (e.clientX - s.l) / s.x, y: (e.clientY - s.t) / s.y };
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
