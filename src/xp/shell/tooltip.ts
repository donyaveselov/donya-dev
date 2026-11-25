// Tooltips: shown after a 600 ms hover, at once when moving from one tipped element to the next, gone after 5 s.
// A tip is also its element's accessible name, unless the element has a caption of its own.
import { clamp, h, now } from './dom';
import { localPt, type Pt } from './geometry';
import { domOrNull, S } from './state';

type TipText = string | (() => string);
const tips = new WeakMap<Element, TipText>();
/** The elements named by their tip (aria-label). */
const named = new WeakSet<Element>();

let el: HTMLDivElement | null = null;
let timer = 0;
let hideT = 0;
let lastHide = 0;
let cur: Element | null = null;

function text(t: Element): string {
  const v = tips.get(t) ?? t.getAttribute('data-xp-tip');
  return typeof v === 'function' ? v() : (v ?? '');
}

/** Writes the tip into aria-label (a multi-line tip on one line), if it changed. */
function label(t: Element): void {
  const s = text(t).replace(/\s*\n\s*/g, ', ');
  if (s && t.getAttribute('aria-label') !== s) t.setAttribute('aria-label', s);
}

function show(t: Element, x: number, y: number): void {
  const R = domOrNull();
  const s = text(t);
  if (!R || !s) return;
  hide(true);
  el = h('div', 'xp-tip');
  el.textContent = s;
  R.root.appendChild(el);
  const W = R.root.clientWidth;
  const H = R.root.clientHeight;
  const w = el.offsetWidth;
  const hh = el.offsetHeight;
  const left = clamp(x + 12, 2, W - w - 2);
  let top = y + 18;
  if (top + hh > H - 2) top = y - hh - 6;
  el.style.left = `${String(left)}px`;
  el.style.top = `${String(top)}px`;
  clearTimeout(hideT);
  hideT = window.setTimeout(() => {
    hide();
  }, 5000);
}

function hide(quiet = false): void {
  clearTimeout(timer);
  if (el) {
    el.remove();
    el = null;
    if (!quiet) lastHide = now();
  }
}

function arm(t: Element, p: Pt, ms: number): void {
  clearTimeout(timer);
  timer = window.setTimeout(() => {
    if (cur === t) show(t, p.x, p.y);
  }, ms);
}

export const Tip = {
  over(e: PointerEvent): void {
    if (S.touch && e.pointerType !== 'mouse') return;
    const t = e.target instanceof Element ? e.target.closest('[data-xp-tip]') : null;
    if (t === cur) return;
    cur = t;
    const wasShown = !!el || now() - lastHide < 400;
    hide(true);
    if (wasShown) lastHide = now();
    if (!t) return;
    arm(t, localPt(e), wasShown ? 0 : 600);
  },
  move(e: PointerEvent): void {
    if (!el && cur && timer) arm(cur, localPt(e), 600);
  },
  hide(): void {
    cur = null;
    hide();
  },
  /** asName: the tip is also the element's accessible name (an icon-only button); false when it has its own text. */
  set(node: Element, v: TipText, asName = true): void {
    tips.set(node, v);
    node.setAttribute('data-xp-tip', '');
    if (!asName) return;
    named.add(node);
    label(node);
  },
  /** Refreshes the accessible names under `root`: after a language switch, or when a tip's text changed. */
  relabel(root: ParentNode): void {
    for (const t of root.querySelectorAll('[data-xp-tip]')) if (named.has(t)) label(t);
  },
  get(node: Element): TipText | undefined {
    return tips.get(node);
  },
};
