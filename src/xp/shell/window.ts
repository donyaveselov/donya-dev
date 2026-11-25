// The window manager: windows with title bars, taskbar buttons, z-order, focus, minimize / maximize / restore with
// their XP-style "ghost" animations, title-bar dragging, edge resizing, cascade / tile and Show Desktop.
import type { Lang, XPAppDef } from '../../shared/types';
import type { Text } from '../../shared/i18n';
import { CAPTION_H, DOUBLE_CLICK_MS, Z } from './constants';
import { animate, clamp, closest, css, EASE_IN, EASE_OUT, EASE_STD, esc, h, now, reduced } from './dom';
import { isPhone, localPt, localRect, type Pt, trackPointer, work } from './geometry';
import { ICON } from './glyphs';
import {
  arrangeRect,
  type ArrangeMode,
  cascadePos,
  centerIn,
  dragPos,
  fitSize,
  type GripDir,
  keepReachable,
  placeRect,
  type Rect,
  resizeRect,
} from './layout';
import { closeMenus, openMenu } from './menu';
import { sound } from './sound';
import { closeStart } from './start-menu';
import { dom, domOrNull, S } from './state';
import { L, tr } from './strings';
import { Tip } from './tooltip';
import { maximizedShape, transition, type WinState } from './win-state';

export type WinKind = 'app' | 'dialog' | 'game';
export type { WinState };

export interface WinOptions {
  kind?: WinKind;
  app?: XPAppDef | null;
  title: Text;
  icon?: string;
  w?: number;
  h?: number;
  minW?: number | undefined;
  minH?: number | undefined;
  resizable?: boolean | undefined;
  maximizable?: boolean | undefined;
  maximized?: boolean | undefined;
  /** No title bar (the game hand-off). */
  frameless?: boolean;
  /** Covers the whole desktop, taskbar included, while not minimized. */
  cover?: boolean;
  /** Stays above ordinary windows. */
  modal?: boolean;
  owner?: Win | null;
  noTask?: boolean;
  center?: boolean;
}

/** Behaviour hooks a window's creator may set after creating it. */
export interface WinHooks {
  onEsc?: () => void;
  /** Escape closes it (the built-in programs). */
  escClose?: boolean;
  onRestore?: () => void;
  onMinimize?: () => void;
}

const GRIPS: readonly GripDir[] = ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'];
let seq = 0;
let zCounter = 0;

function zSort(): void {
  S.wins.sort((a, b) => a.modalRank - b.modalRank || a.zo - b.zo);
  S.wins.forEach((w, i) => {
    w.el.style.zIndex = String(w.o.cover && w.state !== 'min' ? Z.cover : Z.windows + i * 2);
  });
}

export function setActive(win: Win | null): void {
  const w = win?.closed ? null : win;
  S.active = w;
  for (const x of S.wins) {
    x.el.classList.toggle('xp--inactive', x !== w);
    x.task?.classList.toggle('xp--on', x === w && x.state !== 'min');
  }
  if (w?.task) stopFlash(w);
  domOrNull()?.desk.classList.toggle('xp--blur', !!w);
}

function topWindow(excl?: Win): Win | null {
  for (let i = S.wins.length - 1; i >= 0; i--) {
    const w = S.wins[i];
    if (w && w !== excl && w.state !== 'min' && !w.closed) return w;
  }
  return null;
}

interface GhostOpts {
  caption?: string;
  icon?: string;
  easing?: string;
}

/** The outline (or caption strip) that flies between a window and its taskbar button. */
export function ghost(from: Rect, to: Rect, ms: number, o: GhostOpts = {}): Promise<void> {
  if (reduced()) return Promise.resolve();
  const g = h('div', `xp-ghost${o.caption ? ' xp-ghost--cap' : ''}`);
  if (o.caption)
    g.innerHTML = `<span class="xp-ghost__ic">${o.icon ?? ''}</span><span class="xp-ghost__t">${esc(o.caption)}</span>`;
  dom().root.appendChild(g);
  const frame = (r: Rect): Keyframe => ({
    left: `${String(r.x)}px`,
    top: `${String(r.y)}px`,
    width: `${String(r.w)}px`,
    height: `${String(r.h)}px`,
    opacity: 1,
  });
  return animate(g, [frame(from), frame(to)], ms, o.easing ?? 'steps(9, end)').then(() => {
    g.remove();
  });
}

/** The opening animation of windows and dialogs (its fill is dropped afterwards). */
export function growIn(el: HTMLElement): void {
  void animate(
    el,
    [
      { opacity: 0, transform: 'scale(.97)' },
      { opacity: 1, transform: 'none' },
    ],
    120,
    EASE_OUT,
  ).then((a) => {
    a?.cancel();
  });
}

export class Win {
  readonly o: WinOptions;
  readonly hooks: WinHooks = {};
  readonly id: string;
  readonly kind: WinKind;
  readonly app: XPAppDef | null;
  readonly resizable: boolean;
  readonly el: HTMLDivElement;
  readonly body: HTMLDivElement;
  readonly titleEl: HTMLDivElement | null;
  readonly icon: string;
  state: WinState = 'normal';
  closed = false;
  langCbs: ((l: Lang) => void)[] = [];
  zo: number;
  readonly modalRank: number;
  rect: Rect;
  prev: Rect | null = null;
  restoreState: WinState = 'normal';
  autoMax = false;
  readonly minW: number;
  readonly minH: number;
  task: HTMLButtonElement | null = null;
  blockedBy: Win | null = null;
  cleanup: (() => void) | null = null;
  unblock: (() => void) | null = null;
  customTitle: string | null = null;
  /** The tab a built-in program shows (kept across language repaints). */
  tab: string | null = null;
  private readonly title: Text;
  private readonly textEl: HTMLSpanElement | null;
  private readonly iconEl: HTMLSpanElement | null;
  private iconClickT = 0;
  private titleDownT = 0;
  private titleDownP: Pt = { x: 0, y: 0 };
  private titleFlashT = 0;
  flashT = 0;

  constructor(o: WinOptions) {
    this.o = o;
    this.id = `w${String(++seq)}`;
    this.kind = o.kind ?? 'app';
    this.app = o.app ?? null;
    this.zo = ++zCounter;
    this.modalRank = o.modal ? 1 : 0;
    this.resizable = o.resizable !== false && this.kind === 'app';
    const el = (this.el = h(
      'div',
      `xp-win xp--inactive${this.resizable ? '' : ' xp--fixed'}${o.frameless ? ' xp--frameless' : ''}${this.kind === 'dialog' ? ' xp-win--dialog' : ''}`,
    ));
    el.setAttribute('role', this.kind === 'dialog' ? 'alertdialog' : 'dialog');
    el.tabIndex = -1;
    let btns = '';
    if (this.kind !== 'dialog') btns += '<button class="xp-tbtn xp-tbtn--min" data-a="min" tabindex="-1"></button>';
    if (this.resizable && o.maximizable !== false)
      btns += '<button class="xp-tbtn xp-tbtn--max" data-a="max" tabindex="-1"></button>';
    btns += '<button class="xp-tbtn xp-tbtn--close" data-a="close" tabindex="-1"></button>';
    el.innerHTML =
      (o.frameless
        ? ''
        : `<div class="xp-win__title"><span class="xp-win__icon"></span><span class="xp-win__text"></span><span class="xp-win__btns">${btns}</span></div>`) +
      '<div class="xp-win__body"></div><div class="xp-win__shield"></div>' +
      (this.resizable ? GRIPS.map((d) => `<i class="xp-grip xp-grip--${d}" data-d="${d}"></i>`).join('') : '');
    this.body = el.querySelector<HTMLDivElement>('.xp-win__body') ?? h('div');
    this.titleEl = el.querySelector<HTMLDivElement>('.xp-win__title');
    this.textEl = el.querySelector<HTMLSpanElement>('.xp-win__text');
    this.iconEl = el.querySelector<HTMLSpanElement>('.xp-win__icon');
    this.title = o.title;
    this.icon = o.icon ?? ICON.window;
    if (this.iconEl) this.iconEl.innerHTML = this.icon;
    this.renderTitle();
    // geometry
    const W = work();
    const size = fitSize(W, o.w ?? 480, o.h ?? 340, S.size === 'compact');
    this.minW = Math.min(o.minW ?? 200, size.w);
    this.minH = Math.min(o.minH ?? 120, size.h);
    const p = o.center
      ? centerIn(this.ownerRect(), size.w, size.h)
      : cascadePos(W, size.w, size.h, S.wins.filter((x) => !x.closed && x.kind === 'app').length, S.size === 'compact');
    this.rect = placeRect(W, p.x, p.y, size.w, size.h);
    this.applyRect();
    dom().wins.appendChild(el);
    if (o.cover) el.classList.add('xp--cover');
    else if (isPhone() && this.kind === 'app') this.setState('max', true);
    else if (o.maximized && this.resizable) this.setState('max');
    this.syncMaxBtn();
    S.wins.push(this);
    zSort();
    if (!o.noTask) this.makeTask();
    this.wire();
  }

  /** What to centre over: the owner window when it shows at its own rect, else the whole work area. */
  private ownerRect(): Rect {
    const ow = this.o.owner;
    if (ow && !ow.closed && ow.state === 'normal') return ow.rect;
    const W = work();
    return { x: 0, y: 0, w: W.w, h: W.h };
  }

  /**
   * The one place the window changes between normal, maximized and minimized (win-state.ts has the rules): the
   * state, the rect to come back to, the classes and the Maximize button move together. `byLayout`: maximized by the
   * phone layout, not by the visitor (clampWindows undoes it on a wider screen).
   */
  setState(next: WinState, byLayout = false): void {
    if (next === this.state) return;
    const { state, rect, prev, restoreState, autoMax } = this;
    const to = transition({ state, rect, prev, restoreState, autoMax }, next, byLayout);
    this.state = to.state;
    this.rect = to.rect;
    this.prev = to.prev;
    this.restoreState = to.restoreState;
    this.autoMax = to.autoMax;
    this.el.classList.toggle('xp--max', maximizedShape(to));
    this.el.classList.toggle('xp--min', to.state === 'min');
    this.syncMaxBtn();
  }

  /** Sizes the window to its content and centres it over its owner, inside the work area (dialogs). */
  fitToContent(): void {
    const el = this.el;
    css(el, { width: 'auto', height: 'auto' });
    // offsetWidth/Height round fractional sizes, and a fraction of a pixel short is enough for a scrollbar: add a
    // spare pixel, and only let the body scroll when the content really is taller than the screen
    const W = work();
    const fits = el.offsetHeight + 1 <= W.h - 16;
    const w = Math.min(el.offsetWidth + 1, W.w - 16);
    const hh = Math.min(el.offsetHeight + 1, W.h - 16);
    this.body.style.overflow = fits ? 'hidden' : 'auto';
    const c = centerIn(this.ownerRect(), w, hh);
    this.rect = { x: Math.round(clamp(c.x, 0, W.w - w)), y: Math.round(clamp(c.y, 0, W.h - hh)), w, h: hh };
    this.applyRect();
  }

  /** A modal dialog blocks this window (or lets it go): its title bar and content go inert meanwhile. */
  setBlockedBy(dialog: Win | null): void {
    this.blockedBy = dialog;
    for (const part of [this.titleEl, this.body]) if (part) part.inert = !!dialog;
  }

  titleText(): string {
    return this.customTitle ?? tr(this.title);
  }

  renderTitle(): void {
    const t = this.titleText();
    if (this.textEl) this.textEl.textContent = t;
    const span = this.task?.querySelector('span');
    if (span) span.textContent = t;
    this.el.setAttribute('aria-label', t);
  }

  applyRect(): void {
    if (this.state === 'max' || this.o.cover) {
      css(this.el, { left: '', top: '', width: '', height: '' });
      return;
    }
    css(this.el, { left: this.rect.x, top: this.rect.y, width: this.rect.w, height: this.rect.h });
  }

  syncMaxBtn(): void {
    const b = this.el.querySelector('.xp-tbtn--max');
    if (!b) return;
    b.classList.toggle('xp--restore', this.state === 'max');
    Tip.set(b, () => (this.state === 'max' ? L('restore') : L('maximize')));
  }

  private makeTask(): void {
    const b = h('button', 'xp-task xp--appear', `${this.icon}<span></span>`);
    b.tabIndex = -1;
    const span = b.querySelector('span');
    if (span) span.textContent = this.titleText();
    Tip.set(b, () => this.titleText());
    b.addEventListener('click', () => {
      if (S.modalBlock && this.blockedBy) {
        this.blockedBy.focus();
        this.blockedBy.flashTitle();
        return;
      }
      if (this.state === 'min') void this.restore();
      else if (S.active === this) void this.minimize();
      else this.focus();
    });
    b.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const r = localRect(b);
      this.focus(true);
      this.sysMenu(r.x, r.y, true);
    });
    this.task = b;
    dom().tasks.appendChild(b);
    setTimeout(() => {
      b.classList.remove('xp--appear');
    }, 300);
  }

  private wire(): void {
    const el = this.el;
    el.addEventListener(
      'pointerdown',
      () => {
        if (!this.closed) this.focus();
      },
      true,
    );
    const title = this.titleEl;
    const icon = this.iconEl;
    if (title && icon) {
      title.addEventListener('pointerdown', (e) => {
        this.titleDown(title, e);
      });
      title.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        const p = localPt(e);
        this.sysMenu(p.x, p.y);
      });
      icon.addEventListener('pointerdown', (e) => {
        e.stopPropagation();
        this.focus();
      });
      icon.addEventListener('click', (e) => {
        e.stopPropagation();
        // a double click on the window icon closes the window, as in XP
        const t = now();
        if (this.iconClickT && t - this.iconClickT < DOUBLE_CLICK_MS) {
          closeMenus(0);
          this.close();
          return;
        }
        this.iconClickT = t;
        const r = localRect(icon);
        this.sysMenu(r.x - 2, r.y + r.h + 4);
      });
      for (const b of el.querySelectorAll<HTMLButtonElement>('.xp-tbtn')) {
        const a = b.dataset.a;
        if (!Tip.get(b)) Tip.set(b, () => (a === 'min' ? L('minimize') : a === 'close' ? L('close') : L('help')));
        b.addEventListener('pointerdown', (e) => {
          e.stopPropagation();
          this.focus();
        });
        b.addEventListener('click', (e) => {
          e.stopPropagation();
          Tip.hide();
          if (a === 'min') void this.minimize();
          else if (a === 'max') this.toggleMax();
          else if (a === 'close') this.close();
        });
      }
    }
    for (const g of el.querySelectorAll<HTMLElement>('.xp-grip'))
      g.addEventListener('pointerdown', (e) => {
        this.gripDown(g, g.dataset.d as GripDir, e);
      });
  }

  focus(silent = false): this {
    if (this.closed) return this;
    if (this.blockedBy && !this.blockedBy.closed) {
      this.blockedBy.focus();
      return this;
    }
    if (this.state === 'min') {
      void this.restore();
      return this;
    }
    this.zo = ++zCounter;
    zSort();
    if (S.active !== this) setActive(this);
    closeStart();
    const ae = document.activeElement;
    if (!silent && !(ae && this.el.contains(ae))) this.el.focus({ preventScroll: true });
    return this;
  }

  sysMenu(x: number, y: number, up = false): void {
    openMenu(
      [
        {
          label: L('restore'),
          disabled: this.state === 'normal',
          onClick: () => {
            if (this.state === 'min') void this.restore();
            else this.toggleMax();
          },
        },
        { label: L('move'), disabled: true },
        { label: L('size'), disabled: true },
        {
          label: L('minimize'),
          disabled: this.state === 'min' || this.kind === 'dialog',
          onClick: () => void this.minimize(),
        },
        {
          label: L('maximize'),
          disabled: this.state === 'max' || !this.resizable || this.o.maximizable === false || isPhone(),
          onClick: () => {
            if (this.state === 'min') void this.restore();
            this.maximize();
          },
        },
        { sep: true },
        {
          label: `${L('close')}        Alt+F4`,
          bold: true,
          onClick: () => {
            this.close();
          },
        },
      ],
      x,
      y,
      { up },
    );
  }

  /** The caption strip: what the ghost animations fly. */
  private captionRect(): Rect {
    const r = localRect(this.el);
    return { x: r.x, y: r.y, w: r.w, h: Math.min(r.h, CAPTION_H) };
  }

  private taskRect(): Rect {
    return this.task ? localRect(this.task) : { x: 0, y: S.h - S.tbH, w: 160, h: 24 };
  }

  /** quiet: no ghost and no sound (the host already showed the minimize). */
  minimize(quiet = false): Promise<void> {
    if (this.closed || this.state === 'min' || this.kind === 'dialog') return Promise.resolve();
    closeMenus(0);
    // a full-screen window flies down as a caption strip, like XP did: not as a screen-sized blue slab
    const from = this.captionRect();
    const to = this.taskRect();
    this.setState('min');
    if (!quiet) sound('minimize');
    if (S.active === this) setActive(topWindow(this));
    this.task?.classList.remove('xp--on');
    zSort();
    this.hooks.onMinimize?.();
    if (quiet) return Promise.resolve();
    const cover = !!this.o.cover;
    return ghost(from, to, cover ? 260 : 220, {
      caption: this.titleText(),
      icon: this.icon,
      easing: cover ? 'steps(10, end)' : 'steps(9, end)',
    });
  }

  restore(): Promise<void> {
    if (this.closed) return Promise.resolve();
    if (this.state !== 'min') {
      if (this.state === 'max') this.toggleMax();
      return Promise.resolve();
    }
    this.setState(this.restoreState);
    this.zo = ++zCounter;
    zSort();
    // measured where it will land, then kept hidden until the ghost has flown there
    const to = this.captionRect();
    this.el.classList.add('xp--min');
    const from = this.taskRect();
    sound('maximize');
    setActive(this);
    this.hooks.onRestore?.();
    return ghost(from, to, 200, { caption: this.titleText(), icon: this.icon }).then(() => {
      if (this.closed || this.state === 'min') return;
      this.el.classList.remove('xp--min');
      void animate(this.el, [{ opacity: 0 }, { opacity: 1 }], 60, 'linear');
      this.focus();
    });
  }

  maximize(): void {
    if (this.state !== 'max') this.toggleMax();
  }

  toggleMax(): void {
    if (this.closed || !this.resizable || this.o.maximizable === false) return;
    if (isPhone() && this.state === 'max') return;
    const before = localRect(this.el);
    this.setState(this.state === 'max' ? 'normal' : 'max');
    this.applyRect();
    const after = localRect(this.el);
    sound('maximize');
    if (!reduced() && after.w && after.h) {
      void animate(
        this.el,
        [
          {
            transformOrigin: '0 0',
            transform: `translate(${String(before.x - after.x)}px,${String(before.y - after.y)}px) scale(${String(before.w / after.w)},${String(before.h / after.h)})`,
          },
          { transformOrigin: '0 0', transform: 'none' },
        ],
        180,
        EASE_STD,
      ).then((a) => {
        a?.cancel();
      });
    }
  }

  /** force: close even while a dialog blocks it. */
  close(force = false): void {
    if (this.closed) return;
    if (!force && this.blockedBy && !this.blockedBy.closed) {
      this.blockedBy.focus();
      this.blockedBy.flashTitle();
      return;
    }
    this.closed = true;
    closeMenus(0);
    // close owned dialogs first
    for (const x of S.wins.slice()) if (x.o.owner === this) x.close(true);
    try {
      this.cleanup?.();
    } catch (e) {
      console.error(e);
    }
    this.langCbs = [];
    const i = S.wins.indexOf(this);
    if (i >= 0) S.wins.splice(i, 1);
    const owner = this.o.owner;
    if (S.active === this || !S.active) setActive(owner && !owner.closed ? owner : topWindow());
    if (S.active && this.kind === 'dialog') S.active.focus();
    if (this.kind !== 'game') sound('close');
    const el = this.el;
    if (this.state === 'min') el.remove();
    else
      void animate(
        el,
        [
          { opacity: 1, transform: 'scale(1)' },
          { opacity: 0, transform: 'scale(.96)' },
        ],
        110,
        EASE_IN,
      ).then(() => {
        el.remove();
      });
    const t = this.task;
    if (t)
      void animate(
        t,
        [
          { flexBasis: `${String(t.offsetWidth)}px`, opacity: 1 },
          { flexBasis: '0px', minWidth: '0px', padding: '0px', opacity: 0 },
        ],
        150,
        EASE_OUT,
      ).then(() => {
        t.remove();
      });
    this.unblock?.();
    if (this.app && S.openApps.get(this.app.id) === this) S.openApps.delete(this.app.id);
  }

  /** The "you have a dialog open" blink of the title bar. */
  flashTitle(): void {
    const n = reduced() ? 2 : 6;
    let k = 0;
    sound('error');
    clearInterval(this.titleFlashT);
    this.titleFlashT = window.setInterval(() => {
      this.el.classList.toggle('xp--inactive');
      k++;
      if (k >= n) {
        clearInterval(this.titleFlashT);
        this.el.classList.toggle('xp--inactive', S.active !== this);
      }
    }, 70);
  }

  // dragging the title bar (with double-click / double-tap to maximise)
  private titleDown(title: HTMLElement, e: PointerEvent): void {
    if (e.button && e.button !== 0) return;
    if (closest(e, '.xp-tbtn') || closest(e, '.xp-win__icon')) return;
    const t = now();
    const p = localPt(e);
    if (
      this.titleDownT &&
      t - this.titleDownT < DOUBLE_CLICK_MS &&
      Math.abs(p.x - this.titleDownP.x) < 8 &&
      Math.abs(p.y - this.titleDownP.y) < 8
    ) {
      this.titleDownT = 0;
      this.toggleMax();
      return;
    }
    this.titleDownT = t;
    this.titleDownP = p;
    if (this.state === 'max' || this.o.cover) return;
    e.preventDefault();
    const { x: ox, y: oy } = this.rect;
    let moved = false;
    trackPointer(
      title,
      e,
      (dx, dy) => {
        if (!moved && Math.abs(dx) + Math.abs(dy) < 3) return;
        if (!moved) {
          moved = true;
          this.el.classList.add('xp--dragging');
          Tip.hide();
        }
        const np = dragPos(work(), this.rect.w, ox + dx, oy + dy);
        this.rect.x = np.x;
        this.rect.y = np.y;
        this.applyRect();
      },
      () => {
        this.el.classList.remove('xp--dragging');
      },
    );
  }

  private gripDown(g: HTMLElement, d: GripDir, e: PointerEvent): void {
    if (this.state === 'max' || (e.button && e.button !== 0)) return;
    e.preventDefault();
    e.stopPropagation();
    this.focus();
    const r0 = { ...this.rect };
    this.el.classList.add('xp--dragging');
    trackPointer(
      g,
      e,
      (dx, dy) => {
        this.rect = resizeRect(r0, d, dx, dy, { w: this.minW, h: this.minH }, work());
        this.applyRect();
      },
      () => {
        this.el.classList.remove('xp--dragging');
      },
    );
  }
}

/* ------------------------------------------------------------------ taskbar button flashing */

export function startFlash(w: Win): void {
  const task = w.task;
  if (!task || S.active === w) return;
  stopFlash(w);
  let k = 0;
  const max = reduced() ? 4 : 8;
  task.classList.add('xp--flashed');
  w.flashT = window.setInterval(() => {
    k++;
    if (k >= max) {
      clearInterval(w.flashT);
      task.classList.add('xp--flashed');
      return;
    }
    task.classList.toggle('xp--flashed');
  }, 500);
}

function stopFlash(w: Win): void {
  clearInterval(w.flashT);
  w.task?.classList.remove('xp--flashed');
}

/* ------------------------------------------------------------------ all windows */

/** After the desktop changes size: phones show app windows maximized, and nothing is left out of reach. */
export function clampWindows(): void {
  const W = work();
  for (const w of S.wins) {
    if (isPhone() && w.kind === 'app' && w.state === 'normal' && !w.o.cover) w.setState('max', true);
    else if (!isPhone() && w.autoMax && w.state === 'max') w.setState('normal');
    w.rect = keepReachable(w.rect, W);
    w.applyRect();
  }
}

export function arrangeWindows(mode: ArrangeMode): void {
  const list = S.wins.filter((w) => !w.closed && w.state !== 'min' && w.kind === 'app' && w.resizable && !w.o.cover);
  const W = work();
  const n = list.length;
  if (!n) return;
  list.forEach((w, i) => {
    w.setState('normal');
    w.rect = arrangeRect(mode, i, n, w.rect, { w: w.minW, h: w.minH }, W);
    w.applyRect();
    w.zo = ++zCounter;
  });
  zSort();
}

let shownDesktop: Win[] | null = null;
/** Show Desktop: minimize every app window; again: bring them back. */
export function showDesktopToggle(): void {
  const vis = S.wins.filter((w) => w.state !== 'min' && w.kind === 'app');
  if (vis.length) {
    shownDesktop = vis;
    for (const w of vis) void w.minimize();
  } else if (shownDesktop) {
    for (const w of shownDesktop) if (!w.closed) void w.restore();
    shownDesktop = null;
  }
}

export function closeAll(): void {
  for (const w of S.wins.slice()) w.close(true);
  S.openApps.clear();
  S.game = null;
}
