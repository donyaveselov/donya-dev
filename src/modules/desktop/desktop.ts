// The public API (XPDesktopApi): mount the desktop into the host, open and close it, switch its language, register
// apps. The room imports it from src/modules/desktop/index.ts; window.XPDesktop exists only in debug mode (src/modules/desktop/install.ts).
import type { Lang, XPDesktopApi, XPMountOptions, XPOpenOptions } from '../../types';
import { openApp, registerApp, setRegisterHook, setSystemOpener } from './apps';
import { clearBalloons, showBalloon } from './taskbar/balloon';
import { isBusy, resetBusy } from './session/busy';
import { clockText, status } from './taskbar/clock';
import { COMPACT_MAX_W, PHONE_MAX_W, TASKBAR_H, TINY_W } from './store/constants';
import { closest, h, coarsePointer, now, on, reflow, sessSet } from './dom';
import { dialog } from './windows/dialog';
import { forgetIcons, layoutIcons, wireDesk } from './desktop-icons';
import { startGame, syncGame } from './session/game';
import { onKey, onKeyUp, onRootDown, resetHotkeys } from './hotkeys';
import { onLang, setLang } from './lang';
import { closeMenus } from './taskbar/menu';
import { registerPopup } from './taskbar/popups';
import { saverRunning, startSaver, stopSaver } from './session/screensaver';
import { bindSession, bsod, boot, preDesktop } from './session/session';
import { soundByName, unlockSound } from './sound';
import { closeStart, openStart, startOpen } from './taskbar/start-menu';
import { domOrNull, loadSaved, type Refs, S, setDom, type SizeClass } from './store/state';
import { BRAND, L, VERSION } from './strings';
import { applyCrt, sysApp } from './system-apps';
import { buildQuickLaunch, buildTaskbar, closeVol, updateTray, watchMute } from './taskbar/taskbar';
import { Tip } from './taskbar/tooltip';
import { paintWall } from './session/wallpaper';
import { clampWindows, closeAll, translateWindows } from './windows/window';

/** The tray clock, the owner's status, the wallpaper's time of day and the idle screen saver are checked this often. */
const TICK_MS = 5000;

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

/** The shell's own chrome in a new language; the windows' content repaints through its own subscriptions. */
function translateShell(l: Lang): void {
  const R = domOrNull();
  if (!R) return;
  updateTray();
  layoutIcons();
  buildQuickLaunch();
  translateWindows(l);
  if (startOpen()) {
    closeStart();
    openStart();
  }
  closeMenus(0);
  R.desk.setAttribute('aria-label', L('desktop'));
}

/**
 * The modules below this one do not import each other in circles: a lower layer (the window manager, the session
 * screens, the app registry) reaches a higher one (menus, the Start menu, the built-in programs) through what is
 * registered here. Returns the undo.
 */
function wireLayers(): (() => void)[] {
  setSystemOpener(sysApp);
  setRegisterHook(() => {
    layoutIcons(false);
    buildQuickLaunch();
  });
  return [
    registerPopup('start', closeStart),
    registerPopup('menus', () => {
      closeMenus(0);
    }),
    registerPopup('volume', closeVol),
    bindSession({ closeDesktop, layoutIcons }),
    onLang(translateShell),
    watchMute(),
    () => {
      setSystemOpener(null);
      setRegisterHook(null);
    },
  ];
}

/** While the desktop is open: the tray, a balloon when the owner's status changes, the wallpaper, the idle saver. */
function startTicking(): () => void {
  let lastStatus = status();
  const t = window.setInterval(() => {
    const st = status();
    if (S.open) {
      updateTray();
      if (st !== lastStatus && !isBusy())
        showBalloon({ title: L(`statusChanged_${st}`), text: L('clockTipPre') + clockText() });
      paintWall();
      const idleMs = now() - (S.lastInput || now());
      if (
        !isBusy() &&
        !saverRunning() &&
        S.prefs.saver !== 'none' &&
        !document.hidden &&
        idleMs > S.prefs.saverMin * 60000
      )
        startSaver();
    }
    // a closed desktop only keeps track (open() repaints the tray and the wallpaper itself)
    lastStatus = st;
  }, TICK_MS);
  return () => {
    clearInterval(t);
  };
}

function mount(host: HTMLElement, opts: XPMountOptions): XPDesktopApi {
  if (S.mounted) unmount();
  loadSaved();
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
  teardown = [
    on(document, 'pointerdown', unlockSound, true),
    on(document, 'keydown', unlockSound, true),
    () => {
      ro.disconnect();
    },
    startTicking(),
    ...wireLayers(),
  ];
  S.mounted = true;
  computeSize();
  paintWall(true);
  updateTray();
  layoutIcons();
  return api;
}

/** Takes the desktop down and leaves the shell's state as it was before mount (registered apps stay). */
function unmount(): void {
  closeAll();
  closeMenus(0);
  closeStart();
  closeVol();
  stopSaver();
  clearBalloons();
  Tip.hide();
  for (const f of teardown) f();
  teardown = [];
  domOrNull()?.root.remove();
  setDom(null); // also ends the desktop's lifetime: boot, shutdown and hand-off sequences stop where they are
  forgetIcons();
  resetHotkeys();
  resetBusy();
  S.modalBlock = null;
  S.active = null;
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
  syncGame();
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
  if (!isBusy()) {
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
  syncGame();
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
