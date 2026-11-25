// The desktop and its icons: grid layout, selection (click, Ctrl+click, rubber band, keyboard), dragging and
// snapping, dropping onto the Recycle Bin, long-press menus on touch, and the desktop's context menu.
import type { XPAppDef } from '../../types';
import { appTitle, openApp } from './apps';
import { CAPTION_H, DOUBLE_CLICK_MS, LONG_PRESS_MS } from './store/constants';
import { D, EASE_IN, EASE_OUT, animate, clamp, css, esc, h, now, on, reflow } from './dom';
import { dialog } from './windows/dialog';
import { gesturePt, isPhone, isTiny, localPt, localRect, type Pt, work } from './windows/geometry';
import { ICON } from './glyphs';
import {
  type Cell,
  cellKey,
  cellXY,
  gridCols,
  gridRows,
  iconInDirection,
  nearestFreeCell,
  nextByLetter,
  placeIcons,
  type Rect,
} from './windows/layout';
import { closeMenus, openMenu } from './taskbar/menu';
import { closePopups } from './taskbar/popups';
import { sound } from './sound';
import { appList, dom, domOrNull, S, savePrefs } from './store/state';
import { BRAND, L } from './strings';
import { sysApp } from './system-apps';
import { Tip } from './taskbar/tooltip';
import { setActive } from './windows/window';
import { paintWall } from './session/wallpaper';

const els = new Map<string, HTMLDivElement>();
const cells = new Map<string, Cell>();
let sel: string[] = [];
let focusId: string | null = null;

const desktopApps = (): XPAppDef[] => appList().filter((a) => a.desktop && !S.trash.includes(a.id));
const leftTop = (el: HTMLElement): Pt => ({ x: parseFloat(el.style.left), y: parseFloat(el.style.top) });
const grid = (): { rows: number; cols: number } => {
  const W = work();
  return { rows: gridRows(W, isPhone()), cols: gridCols(W, isPhone()) };
};

/** Unmount: the icons' elements are gone, and with them the selection. */
export function forgetIcons(): void {
  els.clear();
  cells.clear();
  sel = [];
  focusId = null;
}

function overRecycle(p: Pt | null | undefined): boolean {
  const r = els.get('recycle');
  if (!r || sel.includes('recycle') || !p) return false;
  const { x, y } = leftTop(r);
  return p.x >= x && p.x <= x + r.offsetWidth && p.y >= y && p.y <= y + r.offsetHeight;
}

/** Lays the icons out on the grid; stagger: the boot-time cascade of icons appearing one by one. */
export function layoutIcons(stagger = false): void {
  const R = domOrNull();
  if (!R) return;
  const apps = desktopApps();
  const { rows, cols } = grid();
  const ids = apps.map((a) => a.id);
  for (const [id, el] of els)
    if (!ids.includes(id)) {
      el.remove();
      els.delete(id);
    }
  const pos = placeIcons(ids, S.prefs.autoArrange ? null : S.prefs.icons, rows, cols);
  apps.forEach((a, i) => {
    let el = els.get(a.id);
    if (!el) {
      el = h('div', 'xp-icon', '<div class="xp-icon__img"></div><div class="xp-icon__label"></div>');
      el.dataset.id = a.id;
      el.setAttribute('role', 'button');
      wireIcon(el, a.id);
      R.icons.appendChild(el);
      els.set(a.id, el);
    }
    const img = el.querySelector('.xp-icon__img');
    const label = el.querySelector('.xp-icon__label');
    if (img) img.innerHTML = a.icon ?? ICON.window;
    if (label) label.textContent = appTitle(a);
    el.setAttribute('aria-label', appTitle(a));
    const p = pos.get(a.id) ?? [0, 0];
    cells.set(a.id, p);
    const xy = cellXY(p, isPhone());
    css(el, { left: xy.x, top: xy.y });
    if (stagger) {
      el.classList.remove('xp--appear');
      reflow(el);
      el.style.animationDelay = `${String(D(i * 40))}ms`;
      el.classList.add('xp--appear');
    }
  });
}

export function hideIcons(v: boolean): void {
  domOrNull()?.icons.classList.toggle('xp--preicons', v);
}

function selectIcons(ids: string[], focus?: string | null): void {
  sel = ids.slice();
  for (const [id, el] of els) {
    el.classList.toggle('xp--sel', ids.includes(id));
    el.classList.toggle('xp--focus', id === focus);
  }
  if (focus !== undefined) focusId = focus;
}

function iconOrigin(id: string): Rect | null {
  const img = els.get(id)?.querySelector('.xp-icon__img');
  if (!img) return null;
  const r = localRect(img);
  return { x: r.x - 4, y: r.y, w: r.w + 8, h: Math.min(r.h, CAPTION_H) };
}

/** Opens an app from a launcher, its window flying out of `origin` (the desktop icon by default). */
export function launch(id: string, origin?: Rect | null): void {
  sound('click');
  const o = origin ?? iconOrigin(id);
  const el = S.apps.has(id) ? els.get(id) : undefined;
  if (el) {
    el.classList.add('xp--launch');
    setTimeout(() => {
      el.classList.remove('xp--launch');
    }, 300);
  }
  openApp(id, undefined, o);
}

/** The ring that grows under a finger during a long press; returns its remover. */
function lpRing(p: Pt): () => void {
  const r = h('div', 'xp-lpring');
  css(r, { left: p.x - 12, top: p.y - 12 });
  dom().root.appendChild(r);
  void animate(
    r,
    [
      { transform: 'scale(.2)', opacity: 0 },
      { transform: 'scale(1)', opacity: 1 },
    ],
    LONG_PRESS_MS,
    'linear',
  );
  return () => {
    r.remove();
  };
}

function buzz(): void {
  try {
    navigator.vibrate(10);
  } catch {
    /* no vibration motor */
  }
}

interface IconDrag {
  p: Pt;
  /** Pointer positions of this gesture in the desktop's pixels. */
  pt: (e: PointerEvent) => Pt;
  id: number;
  moved: boolean;
  touch: boolean;
  start: Map<string, Pt>;
  ring?: () => void;
  last?: Pt;
}

function wireIcon(el: HTMLDivElement, id: string): void {
  let down: IconDrag | null = null;
  let lastDown = 0;
  let lpT = 0;
  el.addEventListener('pointerdown', (e) => {
    if (e.button === 2) return;
    e.stopPropagation();
    closeMenus(0);
    closePopups('start');
    setActive(null);
    dom().desk.focus({ preventScroll: true });
    const t = now();
    const pt = gesturePt();
    const p = pt(e);
    const touch = e.pointerType !== 'mouse';
    if (e.ctrlKey || e.metaKey) {
      const s = sel.slice();
      const k = s.indexOf(id);
      if (k >= 0) s.splice(k, 1);
      else s.push(id);
      selectIcons(s, id);
      return;
    }
    selectIcons(sel.includes(id) ? sel : [id], id);
    if (!touch && t - lastDown < DOUBLE_CLICK_MS) {
      lastDown = 0;
      launch(id);
      return;
    }
    lastDown = t;
    const d: IconDrag = { p, pt, id: e.pointerId, moved: false, touch, start: new Map() };
    for (const sid of sel) {
      const x = els.get(sid);
      if (x) d.start.set(sid, leftTop(x));
    }
    down = d;
    try {
      el.setPointerCapture(e.pointerId);
    } catch {
      /* the pointer is already gone */
    }
    if (touch) {
      clearTimeout(lpT);
      const offRing = lpRing(p);
      d.ring = offRing;
      lpT = window.setTimeout(() => {
        offRing();
        if (down && !down.moved) {
          const dd = down;
          down = null;
          buzz();
          iconMenu(id, dd.p.x, dd.p.y);
        }
      }, LONG_PRESS_MS);
    }
  });
  el.addEventListener('pointermove', (e) => {
    if (down?.id !== e.pointerId) return;
    const q = down.pt(e);
    const dx = q.x - down.p.x;
    const dy = q.y - down.p.y;
    if (!down.moved && Math.abs(dx) + Math.abs(dy) < (down.touch ? 10 : 4)) return;
    clearTimeout(lpT);
    down.ring?.();
    if (!down.moved) {
      down.moved = true;
      for (const sid of sel) els.get(sid)?.classList.add('xp--dragging');
      Tip.hide();
    }
    for (const sid of sel) {
      const s = down.start.get(sid);
      const x = els.get(sid);
      if (s && x) css(x, { left: s.x + dx, top: s.y + dy });
    }
    down.last = q;
    els.get('recycle')?.classList.toggle('xp--drop', overRecycle(q));
  });
  el.addEventListener('pointerup', (e) => {
    clearTimeout(lpT);
    if (down?.id !== e.pointerId) return;
    down.ring?.();
    const d = down;
    down = null;
    if (d.moved) {
      dropIcons(d.last);
      return;
    }
    if (d.touch) launch(id);
  });
  el.addEventListener('pointercancel', () => {
    clearTimeout(lpT);
    down?.ring?.();
    if (down?.moved) dropIcons();
    down = null;
  });
  el.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!sel.includes(id)) selectIcons([id], id);
    const p = localPt(e);
    iconMenu(id, p.x, p.y);
  });
}

function dropIcons(p?: Pt): void {
  const bin = els.get('recycle');
  bin?.classList.remove('xp--drop');
  if (bin && overRecycle(p)) {
    const b = leftTop(bin);
    for (const id of sel) {
      const el = els.get(id);
      if (!el) continue;
      S.trash.push(id);
      const { x, y } = leftTop(el);
      el.classList.remove('xp--dragging');
      void animate(
        el,
        [
          { transform: 'none', opacity: 0.6 },
          { transform: `translate(${String(b.x - x)}px,${String(b.y - y)}px) scale(.2)`, opacity: 0 },
        ],
        220,
        EASE_IN,
      ).then(() => {
        el.remove();
        els.delete(id);
      });
    }
    sound('recycle');
    void animate(
      bin,
      [{ transform: 'scale(1)' }, { transform: 'scale(1.12)' }, { transform: 'scale(1)' }],
      260,
      EASE_OUT,
    );
    sel = [];
    return;
  }
  const { rows, cols } = grid();
  const taken = new Set<string>();
  for (const id of els.keys()) {
    const c = cells.get(id);
    if (!sel.includes(id) && c) taken.add(cellKey(c));
  }
  for (const id of sel) {
    const el = els.get(id);
    if (!el) continue;
    el.classList.remove('xp--dragging');
    const { x, y } = leftTop(el);
    const best = nearestFreeCell(x, y, taken, rows, cols, isPhone()) ?? cells.get(id) ?? [0, 0];
    taken.add(cellKey(best));
    cells.set(id, best);
    S.prefs.icons[id] = best;
    const xy = cellXY(best, isPhone());
    el.classList.add('xp--snap');
    css(el, { left: xy.x, top: xy.y });
    setTimeout(() => {
      el.classList.remove('xp--snap');
    }, 200);
  }
  S.prefs.autoArrange = false;
  savePrefs();
}

function arrangeIcons(by: 'name' | 'type'): void {
  const apps = desktopApps().sort((a, b) =>
    by === 'type'
      ? String(a.startMenu ?? '').localeCompare(String(b.startMenu ?? '')) || appTitle(a).localeCompare(appTitle(b))
      : appTitle(a).localeCompare(appTitle(b)),
  );
  const { rows } = grid();
  S.prefs.icons = {};
  apps.forEach((a, i) => {
    S.prefs.icons[a.id] = [Math.floor(i / rows), i % rows];
  });
  savePrefs();
  layoutIcons();
}

/** F5 / Refresh: the icons blink and the wallpaper repaints. */
function refreshDesktop(): void {
  const icons = domOrNull()?.icons;
  if (!icons) return;
  icons.classList.add('xp--flicker');
  setTimeout(
    () => {
      icons.classList.remove('xp--flicker');
      paintWall(true);
      layoutIcons();
    },
    D(90) + 30,
  );
}

function iconMenu(id: string, x: number, y: number): void {
  const app = S.apps.get(id);
  if (!app) return;
  openMenu(
    [
      {
        label: L('open'),
        bold: true,
        onClick: () => {
          launch(id);
        },
      },
      { sep: true },
      { label: L('createShortcut'), disabled: true },
      {
        label: L('del'),
        onClick: () => {
          dialog({ title: appTitle(app), icon: 'warn', text: L('deleteNo') });
        },
      },
      { label: L('rename'), disabled: true },
      { sep: true },
      {
        label: L('properties'),
        onClick: () => {
          appProps(app);
        },
      },
      ...(id === 'recycle' && S.trash.length
        ? [
            { sep: true },
            {
              label: L('restoreIcons', S.trash.length),
              onClick: () => {
                S.trash = [];
                layoutIcons(true);
                sound('maximize');
              },
            },
          ]
        : []),
    ],
    x,
    y,
    { bottomSheet: isTiny() },
  );
}

function appProps(app: XPAppDef): void {
  dialog({
    title: `${L('properties')}: ${appTitle(app)}`,
    icon: 'none',
    html: `<div class="xp-props"><div class="xp-props__ic">${app.icon ?? ICON.window}</div><div><b>${esc(appTitle(app))}</b><br>${esc(L('typeLabel'))}<br>${esc(L('locLabel'))}<br>ID: ${esc(app.id)}</div></div>`,
  });
}

function deskMenu(x: number, y: number): void {
  openMenu(
    [
      {
        label: L('arrangeBy'),
        sub: [
          {
            label: L('byName'),
            onClick: () => {
              arrangeIcons('name');
            },
          },
          {
            label: L('byType'),
            onClick: () => {
              arrangeIcons('type');
            },
          },
          { sep: true },
          {
            label: L('autoArrange'),
            check: S.prefs.autoArrange,
            onClick: () => {
              S.prefs.autoArrange = !S.prefs.autoArrange;
              if (S.prefs.autoArrange) arrangeIcons('name');
              savePrefs();
            },
          },
          { label: L('alignGrid'), check: true, disabled: true },
        ],
      },
      { label: L('refresh'), onClick: refreshDesktop },
      { sep: true },
      { label: L('paste'), disabled: true },
      { label: L('pasteShortcut'), disabled: true },
      { sep: true },
      {
        label: L('newItem'),
        sub: [
          { label: L('folder'), icon: ICON.folder, disabled: true },
          { label: L('shortcut'), disabled: true },
        ],
      },
      { sep: true },
      {
        label: L('properties'),
        onClick: () => {
          sysApp('display');
        },
      },
    ],
    x,
    y,
    { bottomSheet: isTiny() },
  );
}

/** Pointer handling on the empty desktop: deselect, rubber-band selection, long-press menu on touch. */
export function wireDesk(): void {
  const { desk, icons, wins } = dom();
  let band: HTMLDivElement | null = null;
  let bs: { x: number; y: number; base: string[]; pt: (e: PointerEvent) => Pt } | null = null;
  let lpT = 0;
  const onDesk = (e: Event): boolean => e.target === desk || e.target === icons || e.target === wins;
  desk.addEventListener('pointerdown', (e) => {
    if (!onDesk(e)) return;
    closeMenus(0);
    closePopups('start');
    setActive(null);
    desk.focus({ preventScroll: true });
    if (e.button === 2) return;
    if (!(e.ctrlKey || e.metaKey)) selectIcons([], null);
    const pt = gesturePt();
    const p = pt(e);
    if (e.pointerType !== 'mouse') {
      // a long press opens the desktop's menu, unless the finger lifts, moves away or the browser takes the touch
      clearTimeout(lpT);
      const offRing = lpRing(p);
      const end = (): void => {
        clearTimeout(lpT);
        offRing();
        for (const off of offs) off();
      };
      const offs = [
        on(desk, 'pointerup', end),
        on(desk, 'pointercancel', end),
        on(desk, 'pointermove', (ev) => {
          const q = pt(ev);
          if (Math.abs(q.x - p.x) + Math.abs(q.y - p.y) > 10) end();
        }),
      ];
      lpT = window.setTimeout(() => {
        end();
        buzz();
        deskMenu(p.x, p.y);
      }, LONG_PRESS_MS);
      return;
    }
    bs = { x: p.x, y: p.y, base: sel.slice(), pt };
    try {
      desk.setPointerCapture(e.pointerId);
    } catch {
      /* the pointer is already gone */
    }
  });
  desk.addEventListener('pointermove', (e) => {
    if (!bs) return;
    const p = bs.pt(e);
    if (!band) {
      if (Math.abs(p.x - bs.x) + Math.abs(p.y - bs.y) < 3) return;
      band = h('div', 'xp-band');
      desk.appendChild(band);
    }
    const W = work();
    const x1 = Math.max(0, Math.min(bs.x, p.x));
    const y1 = Math.max(0, Math.min(bs.y, p.y));
    const x2 = clamp(Math.max(bs.x, p.x), 0, W.w);
    const y2 = clamp(Math.max(bs.y, p.y), 0, W.h);
    css(band, { left: x1, top: y1, width: x2 - x1, height: y2 - y1 });
    const hit = bs.base.slice();
    for (const [id, el] of els) {
      const { x: ix, y: iy } = leftTop(el);
      if (ix < x2 && ix + el.offsetWidth > x1 && iy < y2 && iy + el.offsetHeight > y1 && !hit.includes(id))
        hit.push(id);
    }
    selectIcons(hit, hit[hit.length - 1] ?? null);
  });
  const end = (): void => {
    bs = null;
    band?.remove();
    band = null;
  };
  desk.addEventListener('pointerup', end);
  desk.addEventListener('pointercancel', end);
  desk.addEventListener('contextmenu', (e) => {
    if (!onDesk(e)) return;
    e.preventDefault();
    const p = localPt(e);
    deskMenu(p.x, p.y);
  });
}

const ARROWS: Partial<Record<string, readonly [number, number]>> = {
  ArrowUp: [0, -1],
  ArrowDown: [0, 1],
  ArrowLeft: [-1, 0],
  ArrowRight: [1, 0],
};

/** Keys while the desktop itself has focus; true when the key was used. */
export function deskKey(e: KeyboardEvent): boolean {
  const ids = [...els.keys()];
  const first = ids[0];
  if (first === undefined) return false;
  const k = e.key;
  const cur = focusId && els.has(focusId) ? focusId : null;
  if (k === 'Enter') {
    for (const id of sel.slice(0, 3)) launch(id);
    return true;
  }
  if ((e.ctrlKey || e.metaKey) && (k === 'a' || k === 'A')) {
    selectIcons(ids, cur ?? first);
    return true;
  }
  if (k === 'F5') {
    refreshDesktop();
    return true;
  }
  if (k === 'Delete') {
    if (sel.length) {
      sound('recycle');
      dialog({ title: BRAND, icon: 'warn', text: L('deleteNo') });
    }
    return true;
  }
  if ((k === 'F10' && e.shiftKey) || k === 'ContextMenu') {
    const el = cur ? els.get(cur) : undefined;
    if (cur && el) {
      const r = localRect(el);
      iconMenu(cur, r.x + 30, r.y + 30);
    } else deskMenu(40, 40);
    return true;
  }
  const dir = ARROWS[k];
  if (dir) {
    const p = cur ? cells.get(cur) : undefined;
    if (!cur || !p) {
      selectIcons([first], first);
      return true;
    }
    const others = ids.filter((id) => id !== cur).map((id) => [id, cells.get(id) ?? p] as const);
    const best = iconInDirection(p, dir, others);
    if (best) selectIcons(e.shiftKey ? [...sel, best] : [best], best);
    return true;
  }
  if (k.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
    const order = ids.slice().sort((a, b) => {
      const pa = cells.get(a) ?? [0, 0];
      const pb = cells.get(b) ?? [0, 0];
      return pa[0] - pb[0] || pa[1] - pb[1];
    });
    const labels = order.map((id) => {
      const a = S.apps.get(id);
      return a ? appTitle(a) : null;
    });
    const i = nextByLetter(labels, cur ? order.indexOf(cur) : -1, k.toLowerCase());
    const id = order[i];
    if (id !== undefined) selectIcons([id], id);
    return true;
  }
  return false;
}
