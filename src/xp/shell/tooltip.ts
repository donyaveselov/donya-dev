// Tooltips: shown after a 600 ms hover, at once when moving from one tipped element to the next, gone after 5 s.
import { clamp, h, now } from './dom';
import { localPt, type Pt } from './geometry';
import { domOrNull, S } from './state';

type TipText = string | (() => string);
const tips = new WeakMap<Element, TipText>();

let el: HTMLDivElement | null = null;
let timer = 0;
let hideT = 0;
let lastHide = 0;
let cur: Element | null = null;

function text(t: Element): string {
  const v = tips.get(t) ?? t.getAttribute('data-xp-tip');
  return typeof v === 'function' ? v() : (v ?? '');
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
  set(node: Element, v: TipText): void {
    tips.set(node, v);
    node.setAttribute('data-xp-tip', '');
  },
  get(node: Element): TipText | undefined {
    return tips.get(node);
  },
};
