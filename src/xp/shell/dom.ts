// Small DOM, timing and storage helpers shared by the shell modules.

// media queries made on first use, so the pure helpers here load without a window (in unit tests)
let mqReduced: MediaQueryList | null = null;
let mqCoarse: MediaQueryList | null = null;
export const reduced = (): boolean => (mqReduced ??= window.matchMedia('(prefers-reduced-motion: reduce)')).matches;
export const coarsePointer = (): boolean => (mqCoarse ??= window.matchMedia('(pointer: coarse)')).matches;
/** A motion duration: 1 ms when the visitor asked for reduced motion. */
export const D = (ms: number): number => (reduced() ? 1 : ms);
export const now = (): number => performance.now();
export const clamp = (v: number, a: number, b: number): number => (v < a ? a : v > b ? b : v);
export const noop = (): void => undefined;
export const wait = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

const ESC: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export function esc(s: string | number | null | undefined): string {
  return (s == null ? '' : String(s)).replace(/[&<>"']/g, (c) => ESC[c] ?? c);
}

/** Reads layout, so that a class removed and added again restarts its CSS animation. */
export function reflow(el: HTMLElement): void {
  el.getBoundingClientRect();
}

/** The element under `root` that matches `sel` (and is of the given type); the shell's own markup always has it. */
export function qs(root: ParentNode, sel: string): HTMLElement;
export function qs<E extends Element>(root: ParentNode, sel: string, type: new () => E): E;
export function qs(root: ParentNode, sel: string, type: new () => Element = HTMLElement): Element {
  const el = root.querySelector(sel);
  if (!(el instanceof type)) throw new Error(`XP: no ${sel}`);
  return el;
}

export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  cls?: string,
  html?: string,
): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html != null) e.innerHTML = html;
  return e;
}

type Target = HTMLElement | Document | Window;
/** addEventListener that returns its own remover. */
export function on<K extends keyof HTMLElementEventMap>(
  el: Target,
  ev: K,
  fn: (e: HTMLElementEventMap[K]) => void,
  opt: boolean | AddEventListenerOptions = false,
): () => void {
  const l = fn as EventListener;
  el.addEventListener(ev, l, opt);
  return () => {
    el.removeEventListener(ev, l, opt);
  };
}

export function rm(el: Element | null | undefined): void {
  el?.remove();
}

const UNITLESS = new Set(['opacity', 'zIndex']);
/** Sets camelCase style properties; numbers become px except for opacity and z-index. */
export function css<E extends HTMLElement>(el: E, o: Record<string, string | number>): E {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(o))
    out[k] = typeof v === 'number' && !UNITLESS.has(k) ? `${String(v)}px` : String(v);
  Object.assign(el.style, out);
  return el;
}

/** The element under an event's target that matches the selector (events here always target elements). */
export function closest(e: Event, sel: string): Element | null {
  const t = e.target;
  return t instanceof Element ? t.closest(sel) : null;
}

const PREFIX = 'donyaos.';
export function storeGet(k: string): unknown {
  try {
    const s = localStorage.getItem(PREFIX + k);
    return s == null ? undefined : (JSON.parse(s) as unknown);
  } catch {
    return undefined;
  }
}
export function storeSet(k: string, v: unknown): void {
  try {
    localStorage.setItem(PREFIX + k, JSON.stringify(v));
  } catch {
    /* storage blocked: the desktop works without it */
  }
}
export function sessGet(k: string): string | null {
  try {
    return sessionStorage.getItem(PREFIX + k);
  } catch {
    return null;
  }
}
export function sessSet(k: string, v: string): void {
  try {
    sessionStorage.setItem(PREFIX + k, v);
  } catch {
    /* storage blocked */
  }
}

/** Web Animations with fill 'both'; resolves (with the animation) when it finishes or is cancelled. */
export function animate(
  el: Element | null | undefined,
  frames: Keyframe[],
  ms: number,
  easing = 'ease',
): Promise<Animation | undefined> {
  const d = D(ms);
  if (!el || d <= 1) return Promise.resolve(undefined);
  const a = el.animate(frames, { duration: d, easing, fill: 'both' });
  return new Promise((res) => {
    a.onfinish = () => {
      res(a);
    };
    a.oncancel = () => {
      res(a);
    };
  });
}
export const EASE_OUT = 'cubic-bezier(.2,.8,.2,1)';
export const EASE_IN = 'cubic-bezier(.6,0,.9,.4)';
export const EASE_STD = 'cubic-bezier(.3,0,.2,1)';
