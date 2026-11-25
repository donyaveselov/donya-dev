// The public API (XPDesktopApi): mount the desktop into the host, open and close it, switch its language, register
// apps. Also published as window.XPDesktop for the room and the regression harness.
import type { XPDesktopApi, XPMountOptions, XPOpenOptions } from '../../shared/types';
import { openApp, registerApp, setRegisterHook } from './apps';
import { clearBalloons, showBalloon } from './balloon';
import { clockText, status } from './clock';
import { COMPACT_MAX_W, PHONE_MAX_W, TASKBAR_H, TINY_W } from './constants';
import { closest, h, coarsePointer, now, on, reflow, sessSet } from './dom';
import { dialog } from './dialog';
import { forgetIcons, layoutIcons, wireDesk } from './desktop-icons';
import { startGame } from './game';
import { onKey, onKeyUp, onRootDown } from './hotkeys';
import { setLang } from './lang';
import { closeMenus } from './menu';
import { saverRunning, startSaver, stopSaver } from './screensaver';
import { bsod, boot, preDesktop } from './session';
import { soundByName, unlockSound } from './sound';
import { closeStart } from './start-menu';
import { domOrNull, type Refs, S, setDom, type SizeClass } from './state';
import { BRAND, L, VERSION } from './strings';
import { applyCrt } from './system-apps';
import { buildQuickLaunch, buildTaskbar, closeVol, updateTray } from './taskbar';
import { Tip } from './tooltip';
import { paintWall } from './wallpaper';
import { clampWindows, closeAll } from './window';

let teardown: (() => void)[] = [];

function sizeClass(w: number): SizeClass {
  return w <= PHONE_MAX_W ? 'phone' : w <= COMPACT_MAX_W ? 'compact' : 'desk';
}

function computeSize(): void {
  const R = domOrNull();
  if (!R) return;
  const w = R.root.clientWidth;
  const hgt = R.root.clientHeight;
  if (!w || !hgt) return;
  const prev = S.size;
  S.w = w;
  S.h = hgt;
  S.size = sizeClass(w);
  S.touch = coarsePointer() || ('ontouchstart' in window && navigator.maxTouchPoints > 0);
  R.root.classList.toggle('xp--phone', S.size === 'phone');
  R.root.classList.toggle('xp--compact', S.size === 'compact');
  R.root.classList.toggle('xp--tiny', w < TINY_W);
  R.root.classList.toggle('xp--touch', S.touch);
  S.tbH = S.size === 'phone' ? TASKBAR_H.phone : TASKBAR_H.desk;
  if (prev !== S.size || S.lastH !== hgt || S.lastW !== w) {
    S.lastH = hgt;
    S.lastW = w;
    layoutIcons();
    clampWindows();
  }
}

function mount(host: HTMLElement, opts: XPMountOptions): XPDesktopApi {
  if (S.mounted) unmount();
  S.opts = opts;
  S.lang = opts.lang === 'en' ? 'en' : 'ru';
  const root = h('div', 'xp xp--hidden');
  root.tabIndex = -1;
  root.setAttribute('role', 'application');
  root.setAttribute('aria-label', BRAND);
  const screen = h('div', 'xp-screen');
  const wall = h('div', 'xp-wall');
  const desk = h('div', 'xp-desk');
  desk.tabIndex = 0;
  desk.setAttribute('aria-label', L('desktop'));
  const icons = h('div', 'xp-icons');
  const wins = h('div', 'xp-wins');
  desk.append(icons, wins);
  const tb = buildTaskbar();
  screen.append(wall, desk, tb.taskbar);
  root.appendChild(screen);
  const crt = h('div', 'xp-crt');
  root.appendChild(crt);
  const refs: Refs = { root, screen, wall, desk, icons, wins, crt, ...tb };
  setDom(refs);
  applyCrt();
  host.appendChild(root);
  buildQuickLaunch();
  wireDesk();
  root.addEventListener('keydown', onKey);
  root.addEventListener('keyup', onKeyUp);
  root.addEventListener('pointerdown', onRootDown, true);
  root.addEventListener('pointerover', (e) => {
    Tip.over(e);
  });
  root.addEventListener('pointermove', (e) => {
    S.lastInput = now();
    Tip.move(e);
  });
  root.addEventListener('pointerleave', () => {
    Tip.hide();
  });
  root.addEventListener('contextmenu', (e) => {
    if (!closest(e, 'input, textarea, [contenteditable="true"]')) e.preventDefault();
  });
  root.addEventListener('dragstart', (e) => {
    if (!closest(e, '[draggable="true"]')) e.preventDefault();
  });
  const ro = new ResizeObserver(computeSize);
  ro.observe(root);
  let lastStatus = status();
  // both ticks idle while the desktop is closed (open() repaints the tray and the wallpaper itself)
  const clock = window.setInterval(() => {
    if (!S.open) {
      lastStatus = status();
      return;
    }
    updateTray();
    const st = status();
    if (st !== lastStatus && !S.busy)
      showBalloon({ title: L(`statusChanged_${st}`), text: L('clockTipPre') + clockText() });
    lastStatus = st;
  }, 5000);
  const slow = window.setInterval(() => {
    if (!S.open) return;
    paintWall();
    if (
      !S.busy &&
      !saverRunning() &&
      S.prefs.saver !== 'none' &&
      !document.hidden &&
      now() - (S.lastInput || now()) > S.prefs.saverMin * 60000
    )
      startSaver();
  }, 5000);
  teardown = [
    on(document, 'pointerdown', unlockSound, true),
    on(document, 'keydown', unlockSound, true),
    () => {
      ro.disconnect();
    },
    () => {
      clearInterval(clock);
      clearInterval(slow);
    },
  ];
  S.mounted = true;
  setRegisterHook(() => {
    layoutIcons(false);
    buildQuickLaunch();
  });
  computeSize();
  paintWall(true);
  updateTray();
  layoutIcons();
  return api;
}

function unmount(): void {
  closeAll();
  closeMenus(0);
  closeStart();
  stopSaver();
  clearBalloons();
  for (const f of teardown) f();
  teardown = [];
  domOrNull()?.root.remove();
  setDom(null);
  forgetIcons();
  setRegisterHook(null);
  S.mounted = false;
  S.open = false;
}

function open(o: XPOpenOptions = {}): void {
  const R = domOrNull();
  if (!S.mounted || !R) {
    console.warn('XPDesktop.open before mount');
    return;
  }
  const wasOpen = S.open;
  S.open = true;
  S.lastInput = now();
  R.root.classList.remove('xp--hidden');
  if (o.instant) {
    R.root.style.transition = 'none';
    reflow(R.root);
    R.root.style.transition = '';
  }
  R.root.focus({ preventScroll: true });
  // a page that has had a gesture may start audio now; browsers without the API never block it here
  if (!('userActivation' in navigator) || navigator.userActivation.hasBeenActive) unlockSound();
  computeSize();
  paintWall();
  updateTray();
  if (o.game) {
    S.booted = true;
    sessSet('booted', '1');
    preDesktop(false);
    startGame(o.game, o.instant);
    return;
  }
  if (S.game && !S.game.closed && !wasOpen) {
    S.game.close(true);
    S.game = null;
  }
  if (!S.booted && !o.instant && !o.noBoot) {
    void boot();
    return;
  }
  if (!S.booted) {
    S.booted = true;
    sessSet('booted', '1');
  }
  if (!S.busy) {
    preDesktop(false);
    layoutIcons(!wasOpen && !o.instant);
  }
}

/** Hides the desktop (it stays mounted, with its windows, for the next sit-down). */
export function closeDesktop(o: { instant?: boolean } = {}): void {
  const R = domOrNull();
  if (!S.mounted || !R) return;
  S.open = false;
  closeMenus(0);
  closeStart();
  closeVol();
  stopSaver();
  Tip.hide();
  if (o.instant) {
    R.root.style.transition = 'none';
    R.root.classList.add('xp--hidden');
    reflow(R.root);
    R.root.style.transition = '';
  } else R.root.classList.add('xp--hidden');
  R.root.blur();
}

export const api: XPDesktopApi = {
  __shell: true,
  version: VERSION,
  mount,
  open,
  close: closeDesktop,
  isOpen: () => S.open,
  setLang,
  lang: () => S.lang,
  registerApp,
  // extras (not part of the contract, handy for the room page and for debugging)
  openApp: (id, p) => openApp(id, p),
  dialog: (o) => dialog(o),
  balloon: (o) => {
    showBalloon(o);
  },
  sound: soundByName,
  bsod,
  screensaver: (k) => {
    startSaver(k ?? 'logo');
  },
  stopScreensaver: stopSaver,
  unmount,
};
