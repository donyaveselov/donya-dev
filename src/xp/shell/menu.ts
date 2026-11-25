// Context menus and their submenus (also All Programs): a stack of open menus with hover and keyboard navigation.
import { clamp, css, esc, h, reduced } from './dom';
import { localRect } from './geometry';
import { menuPos, nextByLetter, nextEnabled, type Rect } from './layout';
import { closePopups } from './popups';
import { sound } from './sound';
import { dom, S } from './state';
import { L } from './strings';

export interface MenuItem {
  label?: string;
  sep?: boolean;
  icon?: string;
  bold?: boolean;
  disabled?: boolean;
  check?: boolean;
  sub?: MenuItem[] | (() => MenuItem[]);
  onClick?: () => void;
}

export interface MenuOpts {
  level?: number;
  cls?: string;
  up?: boolean;
  anchor?: Rect;
  alignBottom?: boolean;
  /** On a narrow screen: a sheet along the bottom, above the taskbar. */
  bottomSheet?: boolean;
  /** Opened from the keyboard: highlight the first row. */
  keyboard?: boolean;
  onClose?: () => void;
}

export interface Menu {
  items: MenuItem[];
  el: HTMLDivElement;
  rows: (HTMLDivElement | null)[];
  hot: number;
  subT: number;
  /** The parent row this submenu opened from. */
  from: number | null;
  /** All Programs (it must not reopen while it is up). */
  fromAll: boolean;
  onClose: (() => void) | undefined;
}

/** The open menus, root first. */
export const menus: Menu[] = [];
/** How many open menus the pointer is inside (a Start menu row only closes them once it has left them all). */
export const menuHover = { inside: 0 };

export function closeMenus(from = 0): void {
  if (!from) menuHover.inside = 0;
  while (menus.length > from) {
    const m = menus.pop();
    if (!m) break;
    clearTimeout(m.subT);
    m.el.remove();
    m.onClose?.();
  }
}

export function openMenu(source: MenuItem[] | (() => MenuItem[]), x: number, y: number, opts: MenuOpts = {}): Menu {
  const level = opts.level ?? 0;
  closeMenus(level);
  const items = typeof source === 'function' ? source() : source;
  const el = h('div', `xp-menu${opts.cls ? ` ${opts.cls}` : ''}${opts.up ? ' xp--up' : ''}`);
  const m: Menu = { items, el, rows: [], hot: -1, subT: 0, from: null, fromAll: false, onClose: opts.onClose };
  el.setAttribute('role', 'menu');
  if (!items.length) el.appendChild(h('div', 'xp-menu__empty', esc(L('emptyMenu'))));
  items.forEach((it, i) => {
    if (it.sep) {
      el.appendChild(h('div', 'xp-msep'));
      m.rows.push(null);
      return;
    }
    const cls =
      'xp-mi' +
      (it.bold ? ' xp-mi--bold' : '') +
      (it.disabled ? ' xp-mi--dis' : '') +
      (it.sub ? ' xp-mi--sub' : '') +
      (it.check ? ' xp-mi--check' : '');
    const row = h(
      'div',
      cls,
      `<span class="xp-mi__ic">${it.icon ?? ''}</span><span class="xp-mi__t">${esc(it.label)}</span>`,
    );
    row.setAttribute('role', 'menuitem');
    row.addEventListener('pointerenter', () => {
      keepParents(m);
      setHot(m, i, true);
    });
    row.addEventListener('click', (e) => {
      e.stopPropagation();
      activate(m, i);
    });
    el.appendChild(row);
    m.rows.push(row);
  });
  el.addEventListener('pointerdown', (e) => {
    e.stopPropagation();
  });
  el.addEventListener('pointerenter', () => {
    menuHover.inside++;
    keepParents(m);
  });
  el.addEventListener('pointerleave', () => {
    menuHover.inside = Math.max(0, menuHover.inside - 1);
  });
  el.addEventListener('contextmenu', (e) => {
    e.preventDefault();
  });
  const root = dom().root;
  root.appendChild(el);
  const W = root.clientWidth;
  const H = root.clientHeight;
  const w = el.offsetWidth;
  const hh = el.offsetHeight;
  let { x: left, y: top } = menuPos({ w: W, h: H }, w, hh, x, y, opts);
  if (opts.bottomSheet) {
    left = 0;
    top = H - S.tbH - hh;
    css(el, { width: W, maxWidth: W });
  }
  css(el, { left: clamp(left, 0, Math.max(0, W - w)), top: clamp(top, 0, Math.max(0, H - hh)) });
  menus.push(m);
  if (opts.keyboard) setHot(m, nextRow(m, -1, 1));
  sound(level ? 'tick' : 'click');
  return m;
}

// The pointer reached menu `m`: every menu above it must stay open. Crossing sibling rows on the way to a submenu
// starts their "close the submenu" timers; cancel them and put the highlight back on the row that owns the submenu.
function keepParents(m: Menu): void {
  for (let k = menus.indexOf(m); k > 0; k--) {
    const child = menus[k];
    const parent = menus[k - 1];
    if (!child || !parent) continue;
    clearTimeout(parent.subT);
    if (child.from != null && parent.hot !== child.from) {
      parent.rows[parent.hot]?.classList.remove('xp--hot');
      parent.hot = child.from;
      parent.rows[parent.hot]?.classList.add('xp--hot');
    }
  }
}

const nextRow = (m: Menu, from: number, dir: 1 | -1): number =>
  nextEnabled(
    m.rows.map((r, i) => !!r && !m.items[i]?.disabled),
    from,
    dir,
  );

function setHot(m: Menu, i: number, fromHover = false): void {
  m.rows[m.hot]?.classList.remove('xp--hot');
  m.hot = i;
  const idx = menus.indexOf(m);
  clearTimeout(m.subT);
  const row = m.rows[i];
  const it = m.items[i];
  if (i < 0 || !row || !it) return;
  row.classList.add('xp--hot');
  if (fromHover) {
    if (it.sub && !it.disabled)
      m.subT = window.setTimeout(() => {
        openSub(m, i);
      }, 280);
    else if (menus.length > idx + 1)
      m.subT = window.setTimeout(() => {
        closeMenus(idx + 1);
      }, 280);
  }
}

function openSub(m: Menu, i: number, kb = false): void {
  const it = m.items[i];
  const row = m.rows[i];
  const idx = menus.indexOf(m);
  if (idx < 0 || !it?.sub || !row) return;
  if (menus[idx + 1]?.from === i) return;
  const sub = openMenu(it.sub, 0, 0, {
    level: idx + 1,
    anchor: localRect(row),
    cls: m.el.classList.contains('xp-menu--prog') ? 'xp-menu--prog' : '',
    keyboard: kb,
  });
  sub.from = i;
}

function activate(m: Menu, i: number): void {
  const it = m.items[i];
  const row = m.rows[i];
  if (!it || !row || it.disabled) return;
  if (it.sub) {
    openSub(m, i, true);
    return;
  }
  // the era-true double blink before the menu goes away
  const blinks = reduced() ? 0 : 2;
  let k = 0;
  const blink = (): void => {
    if (k < blinks * 2) {
      row.classList.toggle('xp--hot');
      k++;
      setTimeout(blink, 40);
      return;
    }
    closeMenus(0);
    closePopups('start');
    it.onClick?.();
  };
  blink();
}

/** Keyboard navigation in the topmost menu; true when the key was used. */
export function menuKey(e: KeyboardEvent): boolean {
  const m = menus[menus.length - 1];
  if (!m) return false;
  const k = e.key;
  if (k === 'ArrowDown' || k === 'ArrowUp') {
    setHot(m, nextRow(m, m.hot, k === 'ArrowDown' ? 1 : -1));
    return true;
  }
  if (k === 'ArrowRight') {
    if (m.hot >= 0 && m.items[m.hot]?.sub) openSub(m, m.hot, true);
    return true;
  }
  if (k === 'ArrowLeft' || k === 'Escape') {
    closeMenus(menus.length - 1);
    return true;
  }
  if (k === 'Enter' || k === ' ') {
    if (m.hot >= 0) activate(m, m.hot);
    return true;
  }
  if (k.length === 1) {
    const i = nextByLetter(
      m.items.map((it) => (it.label && !it.disabled ? it.label : null)),
      m.hot,
      k.toLowerCase(),
    );
    if (i >= 0) setHot(m, i);
    return true;
  }
  return false;
}
