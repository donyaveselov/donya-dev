// Pure geometry of the window manager, the desktop icon grid and the menus (unit-tested in layout.test.ts).
import { clamp } from './dom';

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}
export interface Size {
  w: number;
  h: number;
}
export type Cell = [col: number, row: number];

/* ------------------------------------------------------------------ windows */

/** A new window's size: the asked size, kept inside the work area. */
export function fitSize(area: Size, w: number, h: number, compact: boolean): Size {
  return { w: Math.min(w, area.w - (compact ? 24 : 8)), h: Math.min(h, area.h - 8) };
}

/** Where the next app window opens: each open app window shifts it one step down and right, wrapping around. */
export function cascadePos(
  area: Size,
  w: number,
  h: number,
  openWindows: number,
  compact: boolean,
): { x: number; y: number } {
  const step = compact ? 16 : 22;
  const maxN = Math.max(1, Math.floor(Math.min((area.w - w) / step, (area.h - h) / step)));
  const k = openWindows % (maxN + 1);
  return {
    x: Math.max(0, (area.w >= 900 ? 110 : 40) + k * step - (area.w < 700 ? 30 : 0)),
    y: Math.max(0, 24 + k * step - (area.h < 500 ? 16 : 0)),
  };
}

/** A rect of the given size centred over another. */
export function centerIn(ref: Rect, w: number, h: number): { x: number; y: number } {
  return { x: ref.x + (ref.w - w) / 2, y: ref.y + (ref.h - h) / 2 };
}

/** The rect at a position, rounded and kept fully inside the work area. */
export function placeRect(area: Size, x: number, y: number, w: number, h: number): Rect {
  return {
    x: Math.round(clamp(x, 0, Math.max(0, area.w - w))),
    y: Math.round(clamp(y, 0, Math.max(0, area.h - h))),
    w,
    h,
  };
}

/** A window dragged by its title: at least 40 px stays on screen sideways, and the title never leaves the top or bottom. */
export function dragPos(area: Size, w: number, x: number, y: number): { x: number; y: number } {
  return { x: Math.round(clamp(x, 40 - w, area.w - 40)), y: Math.round(clamp(y, 0, area.h - 28)) };
}

export type GripDir = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw';

/** A window resized by one of its edges or corners, by (dx, dy) from its rect at the start of the drag. */
export function resizeRect(r0: Rect, dir: GripDir, dx: number, dy: number, min: Size, area: Size): Rect {
  const r = { ...r0 };
  if (dir.includes('e')) r.w = clamp(r0.w + dx, min.w, area.w - r0.x + 200);
  if (dir.includes('s')) r.h = clamp(r0.h + dy, min.h, area.h - r0.y);
  if (dir.includes('w')) {
    const nw = clamp(r0.w - dx, min.w, r0.x + r0.w + 200);
    r.x = r0.x + r0.w - nw;
    r.w = nw;
  }
  if (dir.includes('n')) {
    const nh = clamp(r0.h - dy, min.h, r0.y + r0.h);
    r.y = r0.y + r0.h - nh;
    r.h = nh;
  }
  return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.w), h: Math.round(r.h) };
}

/** After the desktop changes size: no bigger than the work area, and still reachable by its title. */
export function keepReachable(r: Rect, area: Size): Rect {
  const w = Math.min(r.w, area.w);
  const h = Math.min(r.h, area.h);
  return { x: clamp(r.x, 40 - w, area.w - 40), y: clamp(r.y, 0, Math.max(0, area.h - 28)), w, h };
}

/** An app's own resize request: inside the work area, moved back in if it would stick out. */
export function requestedRect(r: Rect, w: number, h: number, min: Size, area: Size): Rect {
  const nw = Math.round(clamp(w, min.w, area.w));
  const nh = Math.round(clamp(h, min.h, area.h));
  return { x: clamp(r.x, 0, Math.max(0, area.w - nw)), y: clamp(r.y, 0, Math.max(0, area.h - nh)), w: nw, h: nh };
}

export type ArrangeMode = 'cascade' | 'h' | 'v';

/** The taskbar's Cascade / Tile commands: window i of n. */
export function arrangeRect(mode: ArrangeMode, i: number, n: number, r: Rect, min: Size, area: Size): Rect {
  let out: Rect;
  if (mode === 'cascade')
    out = {
      x: 20 + i * 26,
      y: 20 + i * 26,
      w: Math.min(r.w, area.w - 40 - i * 26),
      h: Math.min(r.h, area.h - 40 - i * 26),
    };
  else if (mode === 'h') out = { x: 0, y: Math.round((i * area.h) / n), w: area.w, h: Math.round(area.h / n) };
  else out = { x: Math.round((i * area.w) / n), y: 0, w: Math.round(area.w / n), h: area.h };
  out.w = Math.max(out.w, min.w);
  out.h = Math.max(out.h, min.h);
  return out;
}

/* ------------------------------------------------------------------ desktop icon grid */

const iconCell = (phone: boolean): Size => (phone ? { w: 84, h: 92 } : { w: 76, h: 82 });
export const gridRows = (area: Size, phone: boolean): number =>
  Math.max(1, Math.floor((area.h - 8) / iconCell(phone).h));
export const gridCols = (area: Size, phone: boolean): number =>
  Math.max(1, Math.floor((area.w - 8) / iconCell(phone).w));

export function cellXY([c, r]: Cell, phone: boolean): { x: number; y: number } {
  const cl = iconCell(phone);
  return { x: 4 + c * cl.w + (cl.w - (phone ? 80 : 74)) / 2, y: 4 + r * cl.h };
}

const key = (c: number, r: number): string => `${String(c)},${String(r)}`;

/**
 * Cells for the desktop icons: saved positions first (when they still fit and do not collide), then the rest fill
 * the free cells column by column.
 */
export function placeIcons(
  ids: readonly string[],
  saved: Readonly<Record<string, Cell>> | null,
  rows: number,
  cols: number,
): Map<string, Cell> {
  const taken = new Set<string>();
  const pos = new Map<string, Cell>();
  if (saved)
    for (const id of ids) {
      const p = saved[id];
      if (p && p[1] < rows && p[0] < cols + 4 && !taken.has(key(p[0], p[1]))) {
        taken.add(key(p[0], p[1]));
        pos.set(id, p);
      }
    }
  let c = 0;
  let r = 0;
  for (const id of ids) {
    if (pos.has(id)) continue;
    while (taken.has(key(c, r))) {
      r++;
      if (r >= rows) {
        r = 0;
        c++;
      }
    }
    taken.add(key(c, r));
    pos.set(id, [c, r]);
  }
  return pos;
}

/** The free cell nearest to where an icon was dropped (or null when every cell is taken). */
export function nearestFreeCell(
  x: number,
  y: number,
  taken: ReadonlySet<string>,
  rows: number,
  cols: number,
  phone: boolean,
): Cell | null {
  const cl = iconCell(phone);
  const c0 = clamp(Math.round((x - 4) / cl.w), 0, cols - 1);
  const r0 = clamp(Math.round((y - 4) / cl.h), 0, rows - 1);
  let best: Cell | null = null;
  let bd = 1e9;
  for (let c = 0; c < cols; c++)
    for (let r = 0; r < rows; r++) {
      if (taken.has(key(c, r))) continue;
      const dd = (c - c0) * (c - c0) * cl.w * cl.w + (r - r0) * (r - r0) * cl.h * cl.h;
      if (dd < bd) {
        bd = dd;
        best = [c, r];
      }
    }
  return best;
}
export const cellKey = (p: Cell): string => key(p[0], p[1]);

/** Arrow-key navigation between desktop icons: the nearest icon in that direction, favouring the same row or column. */
export function iconInDirection(
  cur: Cell,
  dir: readonly [number, number],
  others: readonly (readonly [string, Cell])[],
): string | null {
  let best: string | null = null;
  let bd = 1e9;
  for (const [id, q] of others) {
    const dx = q[0] - cur[0];
    const dy = q[1] - cur[1];
    if (dir[0] && Math.sign(dx) !== dir[0]) continue;
    if (dir[1] && Math.sign(dy) !== dir[1]) continue;
    const dist = dir[0] ? Math.abs(dx) * 10 + Math.abs(dy) : Math.abs(dy) * 10 + Math.abs(dx);
    if (dist < bd) {
      bd = dist;
      best = id;
    }
  }
  return best;
}

/* ------------------------------------------------------------------ menus */

export interface MenuPlacement {
  /** A submenu: the parent row it opens next to. */
  anchor?: Rect;
  /** Align a submenu's bottom with its row (All Programs). */
  alignBottom?: boolean;
  /** Open upwards (taskbar menus). */
  up?: boolean;
}

/** Where a menu of size (w, h) goes for a click at (x, y) inside a desktop of size `area`. */
export function menuPos(
  area: Size,
  w: number,
  h: number,
  x: number,
  y: number,
  o: MenuPlacement,
): { x: number; y: number } {
  let left = x;
  let top = y;
  if (o.anchor) {
    // a submenu: to the right of the parent row, flipped left if needed
    const a = o.anchor;
    left = a.x + a.w - 3;
    top = o.alignBottom ? a.y + a.h - h + 3 : a.y - 3;
    if (left + w > area.w) left = Math.max(0, a.x - w + 3);
  } else if (left + w > area.w) left = Math.max(0, left - w);
  if (top + h > area.h) top = Math.max(0, o.up ? area.h - h : top - h);
  return { x: left, y: top };
}

/** The next enabled row from `from` in direction `dir`, wrapping; -1 when there is none. */
export function nextEnabled(rows: readonly boolean[], from: number, dir: 1 | -1): number {
  const n = rows.length;
  for (let k = 1; k <= n; k++) {
    const i = (from + dir * k + n * 4) % n;
    if (rows[i]) return i;
  }
  return -1;
}

/** Type-ahead: the next label after `from` that starts with the character, wrapping; -1 when none does. */
export function nextByLetter(labels: readonly (string | null)[], from: number, ch: string): number {
  const n = labels.length;
  for (let j = 1; j <= n; j++) {
    const i = (from + j) % n;
    const l = labels[i];
    if (l?.toLowerCase().startsWith(ch)) return i;
  }
  return -1;
}
