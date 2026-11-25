// The Start menu: pinned and recent programs, places and system items, All Programs (a cascading menu, or an
// accordion on phones), Log Off / Turn Off, and its keyboard navigation.
import type { XPAppDef } from '../../shared/types';
import { appTitle } from './apps';
import { clockText, status } from './clock';
import { css, esc, h, qs, reduced } from './dom';
import { isPhone, localRect } from './geometry';
import { ICON, STATUS_DOT } from './glyphs';
import { launch } from './desktop-icons';
import { nextByLetter } from './layout';
import { closeMenus, type MenuItem, menuHover, menus, openMenu } from './menu';
import { logOffDialog, turnOffDialog } from './session';
import { closePopups } from './popups';
import { sound } from './sound';
import { appList, dom, S } from './state';
import { L, tr, USER } from './strings';
import { sysApp } from './system-apps';

let startEl: HTMLDivElement | null = null;
let hotEl: HTMLElement | null = null;
let allProgT = 0;

export const startOpen = (): boolean => !!startEl;

interface SItem {
  label: string;
  icon?: string | undefined;
  sub?: string;
  big?: boolean;
  bold?: boolean;
  /** Hovering it does not close open submenus (All Programs). */
  keepMenus?: boolean;
  onClick?: ((b: HTMLButtonElement) => void) | undefined;
}

function sItem(o: SItem): HTMLButtonElement {
  const b = h(
    'button',
    `xp-sitem${o.big ? ' xp-sitem--big' : ''}${o.bold ? ' xp-sitem--bold' : ''}`,
    `${o.icon ?? ''}<span class="xp-sitem__txt"><span class="xp-sitem__t">${esc(o.label)}</span>${o.sub ? `<span class="xp-sitem__sub">${esc(o.sub)}</span>` : ''}</span>`,
  );
  b.tabIndex = -1;
  b.addEventListener('click', (e) => {
    e.stopPropagation();
    o.onClick?.(b);
  });
  b.addEventListener('pointerenter', () => {
    startHot(b);
    if (!o.keepMenus)
      setTimeout(() => {
        if (hotEl === b && !menuHover.inside && b.matches(':hover')) closeMenus(0);
      }, 300);
  });
  return b;
}

function startHot(b: HTMLElement | null | undefined): void {
  if (!startEl) return;
  for (const x of startEl.querySelectorAll('.xp--hot')) x.classList.remove('xp--hot');
  hotEl = b ?? null;
  b?.classList.add('xp--hot');
}

/** Launch an app with its window flying out of the item's icon. */
const launchFrom = (a: XPAppDef) => (b: HTMLButtonElement) => {
  launch(a.id, localRect(b.querySelector('svg') ?? b));
};

function programItems(): MenuItem[] {
  const list = appList()
    .filter((a) => a.startMenu === 'pinned' || a.startMenu === 'programs')
    .sort((a, b) => appTitle(a).localeCompare(appTitle(b)));
  return [
    {
      label: L('accessories'),
      icon: ICON.programs,
      sub: () => [
        {
          label: L('runTitle'),
          icon: ICON.run,
          onClick: () => {
            sysApp('run');
          },
        },
        {
          label: L('systemTools'),
          icon: ICON.programs,
          sub: [
            {
              label: L('taskMgr'),
              icon: ICON.taskmgr,
              onClick: () => {
                sysApp('taskmgr');
              },
            },
            {
              label: L('display'),
              icon: ICON.display,
              onClick: () => {
                sysApp('display');
              },
            },
          ],
        },
        {
          label: L('about'),
          icon: ICON.logo,
          onClick: () => {
            sysApp('about');
          },
        },
      ],
    },
    { sep: true },
    ...list.map((a): MenuItem => ({
      label: appTitle(a),
      icon: a.icon,
      onClick: () => {
        launch(a.id, null);
      },
    })),
  ];
}

function buildStart(): HTMLDivElement {
  const el = h('div', 'xp-start');
  el.setAttribute('role', 'menu');
  const st = status();
  el.innerHTML =
    `<div class="xp-start__head"><div class="xp-start__pic">${ICON.avatar}</div><div class="xp-start__who"><div class="xp-start__name">${esc(tr(USER))}</div><div class="xp-start__status"><i></i><span></span></div></div></div>` +
    '<div class="xp-start__cols"><div class="xp-start__left"><div class="xp-start__list"></div><div class="xp-allprog"><div class="xp-ssep"></div></div><div class="xp-start__acc"></div></div><div class="xp-start__right"></div></div>' +
    '<div class="xp-start__foot"></div>';
  qs(el, '.xp-start__status i').style.background = STATUS_DOT[st];
  qs(el, '.xp-start__status span').textContent = `${L(`statusLine_${st}`)} · ${clockText()}`;
  const left = qs(el, '.xp-start__list');
  const right = qs(el, '.xp-start__right');
  const all = appList();
  const pinned = all.filter((a) => a.startMenu === 'pinned');
  for (const a of pinned)
    left.appendChild(
      sItem({
        big: true,
        bold: true,
        icon: a.icon,
        label: appTitle(a),
        sub: a.subtitle ? tr(a.subtitle) : '',
        onClick: launchFrom(a),
      }),
    );
  let recent = S.recent.map((id) => S.apps.get(id)).filter((a): a is XPAppDef => !!a && a.startMenu !== 'pinned');
  if (!recent.length) recent = all.filter((a) => a.startMenu === 'programs').slice(0, 3);
  if (pinned.length && recent.length) left.appendChild(h('div', 'xp-ssep'));
  for (const a of recent) left.appendChild(sItem({ icon: a.icon, label: appTitle(a), onClick: launchFrom(a) }));
  const ap = sItem({
    label: L('allPrograms'),
    keepMenus: true,
    onClick: (b) => {
      allPrograms(b, false);
    },
  });
  ap.classList.add('xp-sitem--all');
  ap.insertAdjacentHTML('beforeend', '<span class="xp-arrow"></span>');
  ap.addEventListener('pointerenter', () => {
    clearTimeout(allProgT);
    allProgT = window.setTimeout(() => {
      if (hotEl === ap && !isPhone()) allPrograms(ap, false);
    }, 350);
  });
  qs(el, '.xp-allprog').appendChild(ap);
  // right column: desktop places in bold, then system
  const places = all.filter((a) => a.desktop && a.startMenu !== 'pinned' && !recent.includes(a)).slice(0, 4);
  for (const a of places)
    right.appendChild(sItem({ bold: true, icon: a.icon, label: appTitle(a), onClick: launchFrom(a) }));
  const openResume = S.opts?.onOpenResume;
  if (openResume)
    right.appendChild(
      sItem({
        bold: true,
        icon: ICON.doc,
        label: L('myResume'),
        onClick: () => {
          closeStart();
          openResume();
        },
      }),
    );
  if (right.children.length) right.appendChild(h('div', 'xp-ssep'));
  const sys = (icon: string, label: string, id: string): HTMLButtonElement =>
    sItem({
      icon,
      label,
      onClick: () => {
        sysApp(id);
      },
    });
  right.appendChild(sys(ICON.settings, L('controlPanel'), 'display'));
  right.appendChild(sys(ICON.taskmgr, L('taskMgr'), 'taskmgr'));
  right.appendChild(h('div', 'xp-ssep'));
  right.appendChild(
    sItem({
      icon: ICON.help,
      label: L('helpSupport'),
      onClick: () => {
        if (S.apps.has('help')) launch('help');
        else sysApp('about');
      },
    }),
  );
  right.appendChild(sys(ICON.run, L('run'), 'run'));
  const foot = qs(el, '.xp-start__foot');
  const footBtns: [string, string, string, () => void][] = [
    ['xp-fbtn--key', ICON.smLogoff, L('logOff'), logOffDialog],
    ['xp-fbtn--power', ICON.smOff, L('turnOff'), turnOffDialog],
  ];
  for (const [cls, icon, label, run] of footBtns) {
    const b = h('button', `xp-fbtn ${cls}`, `<span class="xp-fbtn__i">${icon}</span><span>${esc(label)}</span>`);
    b.tabIndex = -1;
    b.addEventListener('click', (e) => {
      e.stopPropagation();
      closeStart();
      run();
    });
    b.addEventListener('pointerenter', () => {
      startHot(b);
    });
    foot.appendChild(b);
  }
  el.addEventListener('pointerdown', (e) => {
    e.stopPropagation();
    if (!(e.target instanceof Element && e.target.closest('.xp-sitem--all'))) closeMenus(0);
  });
  el.addEventListener('contextmenu', (e) => {
    e.preventDefault();
  });
  return el;
}

function allPrograms(b: HTMLElement, kb: boolean): void {
  if (isPhone()) {
    // an in-place accordion
    const acc = startEl?.querySelector('.xp-start__acc');
    if (!acc) return;
    if (acc.children.length) {
      acc.innerHTML = '';
      return;
    }
    for (const it of programItems()) {
      if (it.sep || it.sub || it.label == null) continue;
      const run = it.onClick;
      acc.appendChild(
        sItem({
          icon: it.icon,
          label: it.label,
          onClick: run
            ? () => {
                run();
              }
            : undefined,
        }),
      );
    }
    acc.appendChild(
      sItem({
        icon: ICON.run,
        label: L('runTitle'),
        onClick: () => {
          sysApp('run');
        },
      }),
    );
    acc.scrollIntoView({ block: 'nearest' });
    return;
  }
  if (menus[0]?.fromAll) return;
  const m = openMenu(programItems(), 0, 0, {
    anchor: localRect(b),
    alignBottom: true,
    cls: 'xp-menu--prog',
    keyboard: kb,
    onClose: () => {
      if (hotEl === b) b.classList.remove('xp--open');
    },
  });
  m.fromAll = true;
  b.classList.add('xp--open');
}

export function openStart(kb = false): void {
  if (startEl || S.busy) return;
  closeMenus(0);
  closePopups('volume');
  const R = dom();
  const el = (startEl = buildStart());
  R.screen.appendChild(el);
  css(el, { maxHeight: `${String(S.h - S.tbH)}px` });
  el.classList.add('xp--anim-in');
  R.startBtn.classList.add('xp--on');
  sound('click');
  hotEl = null;
  if (kb) startHot(el.querySelector<HTMLElement>('.xp-sitem'));
}

export function closeStart(): void {
  const el = startEl;
  if (!el) return;
  startEl = null;
  hotEl = null;
  clearTimeout(allProgT);
  dom().startBtn.classList.remove('xp--on');
  closeMenus(0);
  if (reduced()) {
    el.remove();
    return;
  }
  el.classList.remove('xp--anim-in');
  el.classList.add('xp--anim-out');
  setTimeout(() => {
    el.remove();
  }, 90);
}

export function toggleStart(kb = false): void {
  if (startEl) closeStart();
  else openStart(kb);
}

/** Keyboard navigation in the open Start menu; true when the key was used. */
export function startKey(e: KeyboardEvent): boolean {
  if (!startEl) return false;
  const k = e.key;
  const items = [...startEl.querySelectorAll<HTMLElement>('.xp-sitem, .xp-fbtn')];
  const i = hotEl ? items.indexOf(hotEl) : -1;
  if (k === 'Escape') {
    closeStart();
    return true;
  }
  if (k === 'ArrowDown' || k === 'ArrowUp') {
    const n = items.length;
    const down = k === 'ArrowDown';
    startHot(items[((i < 0 ? (down ? -1 : 0) : i) + (down ? 1 : -1) + n) % n]);
    return true;
  }
  if (k === 'ArrowRight' || k === 'ArrowLeft') {
    if (hotEl?.classList.contains('xp-sitem--all') && k === 'ArrowRight') {
      allPrograms(hotEl, true);
      return true;
    }
    const inRight = hotEl?.closest('.xp-start__right');
    const col = startEl.querySelector<HTMLElement>(
      k === 'ArrowRight' && !inRight ? '.xp-start__right .xp-sitem' : '.xp-start__left .xp-sitem',
    );
    if (col) startHot(col);
    return true;
  }
  if (k === 'Enter' || k === ' ') {
    hotEl?.click();
    return true;
  }
  if (k.length === 1) {
    const j = nextByLetter(
      items.map((it) => it.textContent.trim()),
      i,
      k.toLowerCase(),
    );
    if (j >= 0) startHot(items[j]);
    return true;
  }
  return false;
}
