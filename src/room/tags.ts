// Labels over things: the weather above the window, "local time" above the clock, the two framed pictures, and a
// one-off info note (the diploma's details). They stay hidden until the tour shows them.
import { Box3, Vector3 } from 'three';
import type { Camera, Object3D } from 'three';
import type { Lang } from '../shared/types';
import type { Frame } from './frames';
import { t } from './i18n';
import type { Weather } from './weather';
import { effectiveKind } from './weather';

export type TagKey = 'window' | 'clock' | 'resume' | 'diploma' | 'projects';

interface Tag {
  key: TagKey;
  el: HTMLElement;
  p: Vector3;
  /** the label's size in CSS px, measured when its text changes (not per frame: that would force a layout) */
  w: number;
  h: number;
  /** how far the layout has moved it from its point, as shown now (it glides towards the layout's offset) */
  dx: number;
  dy: number;
  /** the wall it hangs on (0 north, 1 west): hidden while that wall is see-through */
  wall: 0 | 1;
  text: (lang: Lang) => string;
}

export interface TagView {
  camera: Camera;
  width: number;
  height: number;
  /** false at the PC: no labels over the desktop */
  room: boolean;
  isOn: (key: TagKey) => boolean;
  /** how solid each wall is, 0..1 */
  wallK: (wall: 0 | 1) => number;
}

/** The weather label: where I am, and the weather once a reading (or a forced kind) exists. */
export function windowText(lang: Lang, wx: Weather): string {
  const T = t(lang);
  if (!wx.forced && !wx.at) return T.wxNow; // no weather (offline, blocked): still say where I am
  const temp = !wx.forced && wx.temp != null ? ', ' + String(Math.round(wx.temp)) + '°' : '';
  return T.wxNow + ' · ' + T.wx[effectiveKind(wx)] + temp;
}

function topOf(root: Object3D, name: string, dy: number): Vector3 | null {
  const o = root.getObjectByName(name);
  if (!o) return null;
  const b = new Box3().setFromObject(o);
  const v = b.getCenter(new Vector3());
  v.y = b.max.y + dy;
  return v;
}

function label(cls?: string): HTMLElement {
  const el = document.createElement('div');
  el.className = 'tag' + (cls ? ' ' + cls : '');
  el.setAttribute('aria-hidden', 'true');
  document.body.appendChild(el);
  return el;
}

const proj = new Vector3();
/** The gaps kept between two labels' measured boxes, px. The 4 px pixel frame sits outside the box on every side:
 *  sideways that is 8 px of frames plus 4 of air; one above another, the upper one's 12 px tail hangs below it too. */
const GAP_X = 12;
const GAP_Y = 18;
/** how fast a label moved aside glides to its new place (per second): no jumps while the camera turns */
const GLIDE = 14;
/** how far above the point the label's box ends: the stepped tail's tip touches the point */
const TAIL = 12;

/** Where a world point lands on the page (the label's bottom centre), or null when it is off screen. */
function screenAt(p: Vector3, view: TagView): [number, number] | null {
  proj.copy(p).project(view.camera);
  if (!(proj.z < 1 && Math.abs(proj.x) < 1.05 && Math.abs(proj.y) < 1.05)) return null;
  return [((proj.x + 1) / 2) * view.width, ((1 - proj.y) / 2) * view.height - TAIL];
}

/**
 * Pixel chrome must sit on whole pixels, or its 4 px frame and stepped tail smear into grey: the box gets an even
 * whole-pixel width (so the centred tail lands on whole pixels too) and is placed by its top-left corner, rounded.
 * Measures once (when the text or the font changes), not per frame. Returns the box's size.
 */
export function fitPixelBox(el: HTMLElement): { w: number; h: number } {
  el.style.width = '';
  const r = el.getBoundingClientRect();
  const w = Math.ceil(r.width / 2) * 2;
  el.style.width = String(w) + 'px';
  return { w, h: Math.ceil(r.height) };
}

/** Puts a pixel box so that its bottom centre (where the tail starts) is at x, y, on whole pixels. */
export function placePixelBox(el: HTMLElement, x: number, y: number, size: { w: number; h: number }): void {
  el.style.left = String(Math.round(x - size.w / 2)) + 'px';
  el.style.top = String(Math.round(y - size.h)) + 'px';
}

/** Places a label over a world point, or hides it when the point is off screen (or `show` is false). */
function put(el: HTMLElement, size: { w: number; h: number }, p: Vector3, show: boolean, view: TagView): void {
  const at = show ? screenAt(p, view) : null;
  if (at) placePixelBox(el, at[0], at[1], size);
  el.style.opacity = at ? '1' : '0';
}

/** A label to lay out: its anchor (bottom centre) and size. */
export interface Placed {
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * Keeps labels apart (on a phone the clock's, the diploma's and the weather's labels land on each other): each one,
 * from the lowest on screen up, stays where it is or moves up just enough to clear the ones already placed; then it is
 * kept inside the window sideways. Mutates and returns the list.
 */
export function separate(tags: Placed[], width: number): Placed[] {
  const order = [...tags].sort((a, b) => b.y - a.y);
  const done: Placed[] = [];
  for (const t of order) {
    t.x = Math.min(Math.max(t.x, t.w / 2 + GAP_X), Math.max(t.w / 2 + GAP_X, width - t.w / 2 - GAP_X));
    for (let moved = true, guard = 0; moved && guard < tags.length * 2; guard++) {
      moved = false;
      for (const o of done) {
        const apart =
          Math.abs(t.x - o.x) >= (t.w + o.w) / 2 + GAP_X || t.y <= o.y - o.h - GAP_Y || t.y - t.h >= o.y + GAP_Y;
        if (!apart) {
          t.y = o.y - o.h - GAP_Y; // just above the other one
          moved = true;
        }
      }
    }
    done.push(t);
  }
  return tags;
}

export class Tags {
  private readonly tags: Tag[] = [];
  private readonly info = { p: new Vector3(), until: 0, set: false, w: 0, h: 0 };
  private readonly infoEl: HTMLElement;
  private lastPlace = performance.now();

  constructor(root: Object3D, frames: readonly Frame[], wx: Weather) {
    const wp = topOf(root, 'Window_Glass', 0.02);
    const cp = topOf(root, 'Clock_case', 0.1) ?? topOf(root, 'Clock_display', 0.12);
    if (wp)
      this.tags.push({
        key: 'window',
        el: label(),
        p: wp,
        w: 0,
        h: 0,
        dx: 0,
        dy: 0,
        wall: 0,
        text: (lang) => windowText(lang, wx),
      });
    if (cp)
      this.tags.push({
        key: 'clock',
        el: label(),
        p: cp,
        w: 0,
        h: 0,
        dx: 0,
        dy: 0,
        wall: 1,
        text: (lang) => t(lang).localTime,
      });
    for (const f of frames) {
      const tag = f.kind === 'resume' ? 'resumeTag' : 'diplomaTag';
      const p = f.top.clone();
      p.y += 0.06;
      this.tags.push({ key: f.kind, el: label(), p, w: 0, h: 0, dx: 0, dy: 0, wall: 1, text: (lang) => t(lang)[tag] });
    }
    this.infoEl = label('tag--info');
    void document.fonts.ready.then(() => {
      this.measure(); // the web font changes the widths
    });
  }

  private measure(): void {
    for (const tag of this.tags) {
      const { w, h } = fitPixelBox(tag.el);
      tag.w = w;
      tag.h = h;
    }
  }

  /** Rewrites the texts (after a language or weather change). */
  refresh(lang: Lang): void {
    for (const tag of this.tags) {
      const s = tag.text(lang);
      if (tag.el.textContent !== s) tag.el.textContent = s;
    }
    this.measure();
  }

  /** A note over a point for a few seconds. */
  showInfo(p: Vector3, text: string): void {
    this.info.p.copy(p);
    this.info.set = true;
    this.infoEl.textContent = text;
    Object.assign(this.info, fitPixelBox(this.infoEl));
    this.info.until = performance.now() + 4500;
  }

  place(view: TagView): void {
    const now = performance.now();
    const k = 1 - Math.exp((-GLIDE * Math.min(now - this.lastPlace, 100)) / 1000);
    this.lastPlace = now;
    const shown: { tag: Tag; x: number; y: number; at: Placed }[] = [];
    for (const tag of this.tags) {
      const show = !!tag.el.textContent && view.room && view.isOn(tag.key) && view.wallK(tag.wall) > 0.6;
      const at = show ? screenAt(tag.p, view) : null;
      if (at) shown.push({ tag, x: at[0], y: at[1], at: { x: at[0], y: at[1], w: tag.w, h: tag.h } });
      else {
        tag.el.style.opacity = '0';
        tag.dx = tag.dy = 0; // it comes back where its point is, not where it once was pushed
      }
    }
    separate(
      shown.map((s) => s.at),
      view.width,
    );
    for (const { tag, x, y, at } of shown) {
      // the layout's offset is followed smoothly, so a label stepping aside (or back) glides instead of jumping
      tag.dx += (at.x - x - tag.dx) * k;
      tag.dy += (at.y - y - tag.dy) * k;
      placePixelBox(tag.el, x + tag.dx, y + tag.dy, tag);
      tag.el.style.opacity = '1';
    }
    if (this.info.set) put(this.infoEl, this.info, this.info.p, view.room && now < this.info.until, view);
  }
}
