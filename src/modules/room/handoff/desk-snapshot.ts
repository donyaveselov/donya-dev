/* The desktop painted onto the 3D monitor during the hand-off: wallpaper, icons, taskbar, start button, clock,
   measured from the live DOM desktop (already open and laid out, just invisible) and drawn into a canvas. */
import { DESKTOP_DOM as D, desktopWallpaper } from '../../../services/desktop-registry';
import { ctx2d } from '../scene/textures';

interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}
/** An icon label line as the browser wrapped it. */
interface LabelLine {
  t: string;
  x: number;
  w: number;
  y: number;
  h: number;
}
interface IconSnap {
  r: Box;
  im: HTMLImageElement | null;
  label: string;
  lr: Box | null;
  lines: LabelLine[] | null;
  font: { fontSize: string; fontFamily: string; fontWeight: number } | null;
}

export interface DeskSnapshot {
  W: number;
  H: number;
  wall: HTMLImageElement | null;
  icons: IconSnap[];
  tb?: Box;
  sb?: Box;
  sbImg?: HTMLImageElement | null;
  tray?: Box;
  clock: string;
  lang?: string;
  langR?: Box;
  /** every small picture in the taskbar (start flag, quick launch, task and tray icons), drawn where it sits */
  bits: { r: Box; im: HTMLImageElement | null }[];
  startT?: string;
  startTR?: Box;
  task?: Box;
  taskText?: string;
  taskIcon?: HTMLImageElement | null;
}

/** A rectangle in canvas pixels: x, y, w, h. */
export type Rect = [number, number, number, number];

/** Where the painted desktop landed in the canvas, and how to map a snapshot box into it. */
export interface Painted {
  s: number;
  toGlass: (r: Box) => Rect;
}

/** The part of the glass canvas the page takes up: its corner, its size, and canvas pixels per page pixel. */
export interface GlassFit {
  x: number;
  y: number;
  w: number;
  h: number;
  s: number;
}

/**
 * The camera stops where the glass (aspect A, drawn on a cw x ch canvas) covers the W x H page, so the page sees only
 * the centred part of the glass with its own proportions: the full width of a glass that is too tall, the full height
 * of one that is too wide. The desktop is painted into exactly that part.
 */
export function pageOnGlass(W: number, H: number, cw: number, ch: number, A: number): GlassFit {
  const wider = W / H > A;
  const w = wider ? cw : (ch * W) / H;
  const h = wider ? (cw * H) / W : ch;
  return { x: (cw - w) / 2, y: (ch - h) / 2, w, h, s: w / W };
}

/** A page box in canvas pixels. */
export const boxOnGlass = (fit: GlassFit, r: Box): Rect => [
  fit.x + r.x * fit.s,
  fit.y + r.y * fit.s,
  r.w * fit.s,
  r.h * fit.s,
];

// cached: a re-measure never paints a frame without the wallpaper
const images = new Map<string, HTMLImageElement>();
function img(src: string | null | undefined): HTMLImageElement | null {
  if (!src) return null;
  let im = images.get(src);
  if (!im) {
    im = new Image();
    im.src = src;
    images.set(src, im);
  }
  return im;
}
const hrefOf = (el: Element | null): string | null =>
  el?.getAttribute('href') ?? el?.getAttribute('xlink:href') ?? null;
const ready = (im: HTMLImageElement | null | undefined): im is HTMLImageElement => !!im?.complete && !!im.naturalWidth;

/** An icon label as the browser wrapped it: each line's text and box, read character by character from the layout. */
function labelLines(el: Element, rr: DOMRect): LabelLine[] {
  const out: (LabelLine & { top: number; x1: number })[] = [];
  const rg = document.createRange();
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  let cur: (typeof out)[number] | null = null;
  for (let n = walker.nextNode() as Text | null; n; n = walker.nextNode() as Text | null) {
    for (let i = 0; i < n.length; i++) {
      rg.setStart(n, i);
      rg.setEnd(n, i + 1);
      const b = rg.getBoundingClientRect();
      if (!b.width && !b.height) continue;
      if (!cur || b.top > cur.top + b.height * 0.5) {
        cur = { t: '', top: b.top, x: b.left, x1: b.right, y: b.top - rr.top, h: b.height, w: 0 };
        out.push(cur);
      }
      cur.t += n.data.charAt(i);
      cur.x = Math.min(cur.x, b.left);
      cur.x1 = Math.max(cur.x1, b.right);
    }
  }
  return out.map((l) => ({ t: l.t.trim(), x: l.x - rr.left, w: l.x1 - l.x, y: l.y, h: l.h }));
}

export function deskSnapshot(host: HTMLElement | null): DeskSnapshot | null {
  const root = host?.querySelector(D.root);
  if (!root) return null;
  const rr = root.getBoundingClientRect();
  const rel = (el: Element): Box => {
    const b = el.getBoundingClientRect();
    return { x: b.left - rr.left, y: b.top - rr.top, w: b.width, h: b.height };
  };
  const wi = root.querySelector(D.wallpaper);
  const snap: DeskSnapshot = {
    W: rr.width,
    H: rr.height,
    icons: [],
    wall: img(wi ? hrefOf(wi) : desktopWallpaper()),
    clock: root.querySelector(D.clock)?.textContent ?? '',
    bits: [],
  };
  const tb = root.querySelector(D.taskbar);
  if (tb) snap.tb = rel(tb);
  const sb = root.querySelector(D.startButton);
  if (sb) {
    snap.sb = rel(sb);
    const mm = /url\("?([^")]+)"?\)/.exec(getComputedStyle(sb).backgroundImage || '');
    snap.sbImg = img(mm?.[1]);
  }
  const tray = root.querySelector(D.tray);
  if (tray) snap.tray = rel(tray);
  const lg = root.querySelector(D.lang);
  if (lg) {
    snap.lang = lg.textContent;
    snap.langR = rel(lg);
  }
  tb?.querySelectorAll('image').forEach((ie) => {
    const b = ie.getBoundingClientRect();
    if (!b.width) return;
    snap.bits.push({ r: { x: b.left - rr.left, y: b.top - rr.top, w: b.width, h: b.height }, im: img(hrefOf(ie)) });
  });
  const st = root.querySelector(D.startLabel);
  if (st) {
    snap.startT = st.textContent;
    snap.startTR = rel(st);
  }
  const tasks = root.querySelectorAll(D.task);
  const task = tasks[tasks.length - 1];
  if (task) {
    snap.task = rel(task);
    snap.taskText = task.textContent.trim();
    snap.taskIcon = img(task.querySelector('image')?.getAttribute('href'));
  }
  root.querySelectorAll(D.icon).forEach((ic) => {
    const im = ic.querySelector(D.iconImage);
    const lb = ic.querySelector(D.iconLabel);
    if (!im || getComputedStyle(ic).visibility === 'hidden') return;
    const cs = lb ? getComputedStyle(lb) : null;
    snap.icons.push({
      r: rel(im),
      im: img(im.querySelector('image')?.getAttribute('href')),
      label: lb?.textContent ?? '',
      lr: lb ? rel(lb) : null,
      lines: lb ? labelLines(lb, rr) : null,
      font: cs ? { fontSize: cs.fontSize, fontFamily: cs.fontFamily, fontWeight: +cs.fontWeight || 400 } : null,
    });
  });
  return snap;
}

const TASKBAR: readonly [number, string][] = [
  [0, '#1C4CB8'],
  [0.03, '#3F82EE'],
  [0.09, '#2B6CE2'],
  [0.45, '#2560D6'],
  [0.8, '#2057CB'],
  [0.95, '#1A47AE'],
  [1, '#143A93'],
];
const TRAY: readonly [number, string][] = [
  [0, '#0F86DC'],
  [0.04, '#27AEF5'],
  [0.1, '#17A0EE'],
  [0.5, '#1290E3'],
  [0.9, '#0F82D6'],
  [1, '#0B6CBC'],
];
const TASK: readonly [number, string][] = [
  [0, '#4F93F5'],
  [0.12, '#3D82EC'],
  [0.6, '#3275E3'],
  [1, '#2A68D6'],
];
const TAHOMA = 'px Tahoma, Verdana, sans-serif';

function band(g: CanvasRenderingContext2D, r: Rect, stops: readonly [number, string][]): void {
  const gr = g.createLinearGradient(0, r[1], 0, r[1] + r[3]);
  for (const [at, c] of stops) gr.addColorStop(at, c);
  g.fillStyle = gr;
  g.fillRect(r[0], r[1], r[2], r[3]);
}

/** A taskbar button (the minimized window's), optionally with its icon. */
export function taskButton(
  g: CanvasRenderingContext2D,
  b: Rect,
  snap: DeskSnapshot,
  s: number,
  label: string | undefined,
  noIcon = false,
): void {
  band(g, b, TASK);
  if (!noIcon && ready(snap.taskIcon))
    g.drawImage(snap.taskIcon, b[0] + 6 * s, b[1] + (b[3] - 16 * s) / 2, 16 * s, 16 * s);
  g.fillStyle = '#fff';
  g.font = String(11 * s) + TAHOMA;
  g.textAlign = 'left';
  g.textBaseline = 'middle';
  g.fillText(label ?? '', b[0] + 26 * s, b[1] + b[3] / 2, b[2] - 30 * s);
}

/** Paints the snapshot into the canvas of a glass of aspect A, where the page will be (pageOnGlass). */
export function paintDesk(c: HTMLCanvasElement, snap: DeskSnapshot, A: number): Painted {
  const g = ctx2d(c);
  const cw = c.width;
  const ch = c.height;
  const fit = pageOnGlass(snap.W, snap.H, cw, ch, A);
  const { x: rx, y: ry, w: rw, h: rh, s } = fit;
  const toGlass = (r: Box): Rect => boxOnGlass(fit, r);
  g.fillStyle = '#3A6EA5';
  g.fillRect(0, 0, cw, ch);
  const wl = snap.wall;
  if (ready(wl)) {
    const k = Math.max(rw / wl.naturalWidth, rh / wl.naturalHeight);
    const dw = wl.naturalWidth * k;
    const dh = wl.naturalHeight * k;
    g.drawImage(wl, rx + (rw - dw) / 2, ry + (rh - dh) / 2, dw, dh);
  }
  g.textAlign = 'center';
  g.textBaseline = 'top';
  for (const ic of snap.icons) {
    const b = toGlass(ic.r);
    if (ready(ic.im)) g.drawImage(ic.im, b[0], b[1], b[2], b[3]);
    if (ic.lines?.length) {
      // line by line, exactly where the desktop wrapped the label
      const fs = ic.font ? parseFloat(ic.font.fontSize) || 11 : 11;
      const ff = ic.font ? ic.font.fontFamily : 'Tahoma, Verdana, sans-serif';
      g.font = (ic.font && ic.font.fontWeight >= 600 ? 'bold ' : '') + String(fs * s) + 'px ' + ff;
      g.textBaseline = 'middle';
      for (const ln of ic.lines) {
        const cx = rx + (ln.x + ln.w / 2) * s;
        const cy = ry + (ln.y + ln.h / 2) * s;
        g.fillStyle = 'rgba(0,0,0,0.7)';
        g.fillText(ln.t, cx + s, cy + s);
        g.fillStyle = '#fff';
        g.fillText(ln.t, cx, cy);
      }
      g.textBaseline = 'top';
    } else if (ic.lr && ic.label) {
      const l = toGlass(ic.lr);
      g.font = String(11 * s) + TAHOMA;
      g.fillStyle = 'rgba(0,0,0,0.7)';
      g.fillText(ic.label, l[0] + l[2] / 2 + s, l[1] + s, l[2] + 20 * s);
      g.fillStyle = '#fff';
      g.fillText(ic.label, l[0] + l[2] / 2, l[1], l[2] + 20 * s);
    }
  }
  if (snap.tb) band(g, toGlass(snap.tb), TASKBAR);
  if (snap.tray) {
    const tr = toGlass(snap.tray);
    band(g, tr, TRAY);
    g.fillStyle = '#fff';
    g.font = String(11 * s) + TAHOMA;
    g.textAlign = 'right';
    g.textBaseline = 'middle';
    g.fillText(snap.clock, tr[0] + tr[2] - 10 * s, tr[1] + tr[3] / 2);
    if (snap.langR && snap.lang !== undefined) {
      const lr = toGlass(snap.langR);
      g.textAlign = 'center';
      g.fillText(snap.lang, lr[0] + lr[2] / 2, lr[1] + lr[3] / 2);
    }
  }
  if (snap.sb && ready(snap.sbImg)) {
    const sb = toGlass(snap.sb);
    g.drawImage(snap.sbImg, sb[0], sb[1], sb[2], sb[3]);
  }
  if (snap.startT && snap.startTR) {
    const sr = toGlass(snap.startTR);
    g.font = 'italic bold ' + String(14 * s) + 'px "Trebuchet MS", Tahoma, sans-serif';
    g.textAlign = 'left';
    g.textBaseline = 'middle';
    g.fillStyle = 'rgba(0,0,0,0.45)';
    g.fillText(snap.startT, sr[0] + s, sr[1] + sr[3] / 2 + s);
    g.fillStyle = '#fff';
    g.fillText(snap.startT, sr[0], sr[1] + sr[3] / 2);
  }
  if (snap.task) taskButton(g, toGlass(snap.task), snap, s, snap.taskText, true);
  for (const bt of snap.bits) {
    const b = toGlass(bt.r);
    if (ready(bt.im)) g.drawImage(bt.im, b[0], b[1], b[2], b[3]);
  }
  return { s, toGlass };
}
