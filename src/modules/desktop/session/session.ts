// Boot and log-on, the shutdown dialog, Turn Off / Restart / Log Off / Stand By, and the blue screen.
//
// Each of them is a timed sequence: an async function that awaits its pauses (seq.ts) on the mounted desktop's
// lifetime signal, so unmounting ends it at its current pause. While one runs it holds the desktop busy (busy.ts).
import { showBalloon, clearBalloons } from '../taskbar/balloon';
import { beginBusy, isBusy } from './busy';
import { status } from '../taskbar/clock';
import { D, animate, esc, h, now, on, reduced, reflow, sessGet, sessSet } from '../dom';
import { localPt, type Pt } from '../windows/geometry';
import { ICON, wordmark } from '../glyphs';
import { onLang } from '../lang';
import { closePopups } from '../taskbar/popups';
import { after, checkAlive, run, skippable, wait } from './seq';
import { sound, unlockSound } from '../sound';
import { dom, lifetime, S } from '../store/state';
import { L, PC_NAME, type StringKey, tr, USER } from '../strings';
import { closeAll } from '../windows/window';

/** What the session screens need from the desktop above them; desktop.ts provides it on mount. */
export interface SessionHost {
  closeDesktop(o: { instant?: boolean }): void;
  layoutIcons(stagger: boolean): void;
}

let host: SessionHost | null = null;
/** Keyboard handler of the shutdown dialog while it is up. */
let dialogKey: ((e: KeyboardEvent) => boolean) | null = null;
/** What is on screen with text in it, and how each repaints in the current language. */
const translated = new Map<HTMLElement, () => void>();

/** Connects the session to its desktop; the returned function disconnects it and forgets what was on screen. */
export function bindSession(to: SessionHost): () => void {
  host = to;
  const offLang = onLang(() => {
    for (const [el, repaint] of translated) {
      if (el.isConnected) repaint();
      else translated.delete(el);
    }
  });
  return () => {
    offLang();
    host = null;
    dialogKey = null;
    translated.clear();
  };
}

/** A key for the shutdown dialog, when it is up; true when the key was used. */
export const sessionKey = (e: KeyboardEvent): boolean => dialogKey?.(e) ?? false;

/* ------------------------------------------------------------------ screens */

/** A full-screen overlay whose markup follows the desktop's language for as long as it is up. */
function overlay(cls: string, html: () => string): HTMLDivElement {
  const ov = h('div', `xp-ov ${cls}`, html());
  dom().root.appendChild(ov);
  translated.set(ov, () => {
    ov.innerHTML = html();
  });
  return ov;
}

/** Replaces what a screen shows. */
function show(ov: HTMLElement, html: () => string): void {
  ov.innerHTML = html();
  translated.set(ov, () => {
    ov.innerHTML = html();
  });
}

function drop(ov: HTMLElement): void {
  translated.delete(ov);
  ov.remove();
}

const BAND_TOP = '<div class="xp-welcome__band xp-welcome__band--t"></div>';
const BAND_BOTTOM = '<div class="xp-welcome__band xp-welcome__band--b"></div>';
const LOGO = `<div class="xp-welcome__logo">${ICON.logo}</div>`;

/** The blue welcome layout: a left and a right half with a divider, between two bands. */
function welcomeLayout(left: string, right: string, bottomBand = BAND_BOTTOM): string {
  return (
    BAND_TOP +
    '<div class="xp-welcome__mid">' +
    left +
    '<div class="xp-login__div"></div>' +
    `<div class="xp-welcome__r">${right}</div>` +
    '</div>' +
    bottomBand
  );
}

function userTile(cls: string, name: string, caption: string): string {
  return (
    `<button class="xp-login__user ${cls}" tabindex="-1">` +
    `<span class="xp-start__pic">${ICON.avatar}</span>` +
    `<span><span class="xp-login__name">${esc(name)}</span><small>${esc(caption)}</small></span>` +
    '</button>'
  );
}

const ownerTile = (cls = ''): string => userTile(cls, tr(USER), L('account'));

/** "welcome" with the owner's tile and a progress line under it. */
function welcomeHTML(line: StringKey): string {
  return welcomeLayout(
    `<div class="xp-welcome__l">${LOGO}<div class="xp-welcome__w">${esc(L('welcome'))}</div></div>`,
    `${ownerTile('xp--static')}<div class="xp-welcome__line">${esc(L(line))}</div>`,
  );
}

/** The locked computer (the owner is out): a guest log-on. */
function lockHTML(): string {
  return welcomeLayout(
    '<div class="xp-login__l">' +
      LOGO +
      wordmark(true) +
      `<p><b>${esc(L('locked'))}</b><br>${esc(L('lockedWhy'))}</p>` +
      '</div>',
    userTile('xp-login__guest', L('guest'), `${tr(USER)} · ${L('statusLine_outside')}`),
  );
}

/** The log-on screen after Log Off / Switch User. */
function loginHTML(): string {
  return welcomeLayout(
    `<div class="xp-login__l">${LOGO}${wordmark(true)}<p>${esc(L('toBegin'))}</p></div>`,
    ownerTile(),
    '<div class="xp-welcome__band xp-welcome__band--b">' +
      '<button class="xp-login__off" tabindex="-1">' +
      `<span class="xp-shutbtn__i xp--red">${ICON.smOff}</span><span>${esc(L('turnOffBtn'))}</span>` +
      '</button>' +
      `<span class="xp-login__hint">${esc(L('afterLogOff'))}</span>` +
      '</div>',
  );
}

function savingHTML(text: StringKey): string {
  return (
    BAND_TOP +
    '<div class="xp-welcome__mid xp--center">' +
    LOGO +
    `<div class="xp-saving__t">${esc(L(text))}</div>` +
    '</div>' +
    BAND_BOTTOM
  );
}

const BOOT_HTML =
  '<div class="xp-crtline"></div>' +
  '<div class="xp-boot__in">' +
  `<div class="xp-boot__logo"><div class="xp-boot__mark">${ICON.logo}</div>${wordmark(true)}</div>` +
  '<div class="xp-boot__bar"><i></i><i></i><i></i></div>' +
  '</div>' +
  '<div class="xp-boot__foot"><span class="xp-boot__copy"></span><span class="xp-boot__dev"></span></div>' +
  '<div class="xp-boot__skip"></div>';

export function preDesktop(v: boolean): void {
  dom().root.classList.toggle('xp--pre', v);
}

const markBooted = (v: boolean): void => {
  S.booted = v;
  sessSet('booted', v ? '1' : '0');
};

/** Resolves on a press on the overlay or a key on the desktop; `handle` runs inside that event. */
function pressOrKey(ov: HTMLElement, handle?: (e: Event) => void): Promise<void> {
  return new Promise((resolve) => {
    const go = (e: Event): void => {
      for (const off of offs) off();
      handle?.(e);
      resolve();
    };
    const offs = [on(ov, 'pointerdown', go), on(dom().root, 'keydown', go)];
  });
}

/* ------------------------------------------------------------------ power-on */

/** Power-on: (wake from stand-by while the owner sleeps,) the boot screen, (the lock screen while he is out,) welcome. */
export function boot(fast = false): Promise<void> {
  return run(lifetime(), (signal) => bootSteps(fast, signal));
}

/** Stand-by while the owner sleeps: any key, press or real pointer movement wakes the computer (and unlocks audio). */
function wakeGesture(ov: HTMLElement): Promise<void> {
  return new Promise((resolve) => {
    const t0 = now();
    let from: Pt | null = null;
    const wake = (e: Event): void => {
      if (now() - t0 < 300) return;
      if (e instanceof PointerEvent && e.type === 'pointermove') {
        const p = localPt(e);
        if (!from) {
          from = p;
          return;
        }
        if (Math.abs(p.x - from.x) + Math.abs(p.y - from.y) < 12) return;
      }
      for (const off of offs) off();
      unlockSound();
      resolve();
    };
    const offs = [on(ov, 'pointermove', wake), on(ov, 'pointerdown', wake), on(dom().root, 'keydown', wake)];
  });
}

/** The lock screen's guest tile, clicked or chosen with Enter / Space. */
function guestLogOn(lock: HTMLElement): Promise<void> {
  return new Promise((resolve) => {
    const go = (): void => {
      for (const off of offs) off();
      unlockSound();
      resolve();
    };
    const offs = [
      on(lock, 'click', (e) => {
        if (e.target instanceof Element && e.target.closest('.xp-login__user')) go();
      }),
      on(dom().root, 'keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') go();
      }),
    ];
  });
}

async function bootSteps(fast: boolean, signal: AbortSignal): Promise<void> {
  if (isBusy()) return;
  const release = beginBusy();
  preDesktop(true);
  const root = dom().root;
  const st = status();
  let asleep = !fast && st === 'sleep';

  const ov = h('div', 'xp-ov xp-boot', BOOT_HTML);
  // only its texts follow the language: repainting the markup would restart the boot animation
  const paintTexts = (): void => {
    const text = (sel: string, s: string): void => {
      const el = ov.querySelector(sel);
      if (el) el.textContent = s;
    };
    text('.xp-boot__copy', L('copyright'));
    text('.xp-boot__dev', `${PC_NAME} · ${L(`statusLine_${st}`)}`);
    text('.xp-boot__skip', !asleep ? L('skip') : S.touch ? L('sleepScreenTouch') : L('sleepScreen'));
  };
  paintTexts();
  translated.set(ov, paintTexts);
  root.appendChild(ov);

  if (asleep) {
    // the owner is asleep: the computer is in stand-by, wake it first
    ov.classList.add('xp--sleep');
    await wakeGesture(ov);
    sound('crtOn');
    ov.classList.remove('xp--sleep');
    asleep = false;
    paintTexts();
  }

  let pause = skippable(signal);
  const offKey = on(root, 'keydown', () => {
    pause.skip();
  });
  const offPress = on(ov, 'pointerdown', () => {
    unlockSound();
    pause.skip();
  });
  if (reduced()) {
    ov.classList.add('xp--on');
    await pause.wait(300);
  } else {
    await pause.wait(200);
    ov.classList.add('xp--on');
    sound('crtOn');
    await pause.wait(fast ? 600 : 1100);
  }

  if (!fast && st === 'outside') {
    // the owner is out: a locked screen with a guest log-on
    const lock = overlay('xp-welcome xp-login xp-lock', lockHTML);
    drop(ov);
    offKey();
    offPress();
    await guestLogOn(lock);
    sound('click');
    lock.querySelector('.xp-login__user')?.classList.add('xp--chosen');
    await wait(D(250), signal);
    drop(lock);
    pause = skippable(signal);
  }

  let welcome: HTMLDivElement | null = null;
  if (!pause.skipped) {
    welcome = overlay('xp-welcome', () => welcomeHTML('loadingSettings'));
    drop(ov);
    const welcomePause = pause;
    on(welcome, 'pointerdown', () => {
      welcomePause.skip();
    });
    await welcomePause.wait(reduced() ? 300 : 900);
  }
  offKey();
  offPress();
  drop(ov);
  release();
  markBooted(true);
  if (welcome) fadeOut(welcome, signal);
  reveal(true);
}

/** The welcome screen dissolves into the desktop under it. */
function fadeOut(ov: HTMLElement, signal: AbortSignal): void {
  ov.classList.add('xp--fadeout');
  after(D(220) + 20, signal, () => {
    drop(ov);
  });
}

/** The desktop appears; intro: with the taskbar slide, the icon cascade, the start sound and the first-visit balloon. */
export function reveal(intro: boolean): void {
  preDesktop(false);
  if (!intro) {
    host?.layoutIcons(false);
    return;
  }
  const tb = dom().taskbar;
  tb.classList.remove('xp--intro');
  reflow(tb);
  tb.classList.add('xp--intro');
  host?.layoutIcons(true);
  sound('start');
  if (!sessGet('welcomed')) {
    sessSet('welcomed', '1');
    after(D(1400), lifetime(), () => {
      if (S.open && !isBusy())
        showBalloon({ title: L('welcomeBalloonT'), text: S.touch ? L('welcomeBalloonTouch') : L('welcomeBalloon') });
    });
  }
}

/* ------------------------------------------------------------------ the shutdown dialog */

type ShutChoice = 'standby' | 'off' | 'restart' | 'switch' | 'logoff';
type ShutButton = readonly [action: ShutChoice, color: string, icon: string, label: StringKey];

const TURN_OFF_CHOICES: readonly ShutButton[] = [
  ['standby', 'amber', ICON.standby, 'standBy'],
  ['off', 'red', ICON.ginaOff, 'shutDown'],
  ['restart', 'green', ICON.restart, 'restart'],
];
const LOG_OFF_CHOICES: readonly ShutButton[] = [
  ['switch', 'green', ICON.ginaSwitch, 'switchUser'],
  ['logoff', 'amber', ICON.ginaLogoff, 'logOff'],
];

function shutdownDialog(kind: 'off' | 'logoff'): void {
  const R = dom();
  if (isBusy() || R.root.querySelector('.xp-shutblock')) return;
  closePopups('start', 'menus');
  R.screen.classList.add('xp--grey');
  const isOff = kind === 'off';
  const choices = isOff ? TURN_OFF_CHOICES : LOG_OFF_CHOICES;
  // the block takes every press outside the dialog
  const block = h('div', 'xp-shutblock');
  block.addEventListener('pointerdown', (e) => {
    e.stopPropagation();
  });
  R.root.appendChild(block);
  const d = h(
    'div',
    'xp-shutdlg',
    `<div class="xp-shutdlg__h"><span></span><span class="xp-shutdlg__logo">${ICON.logo}</span></div>` +
      '<div class="xp-shutdlg__b"></div>' +
      '<div class="xp-shutdlg__f"><button class="xp-btn"></button></div>',
  );
  const done = (): void => {
    translated.delete(d);
    d.remove();
    block.remove();
    dialogKey = null;
  };
  const cancel = (): void => {
    done();
    R.screen.classList.remove('xp--grey');
    sound('click');
  };
  const body = d.querySelector('.xp-shutdlg__b');
  for (const [action, color, icon] of choices) {
    const b = h('button', 'xp-shutbtn', `<span class="xp-shutbtn__i xp--${color}">${icon}</span><span></span>`);
    b.addEventListener('click', () => {
      done();
      sysAction(action);
    });
    body?.appendChild(b);
  }
  const buttons = [...d.querySelectorAll<HTMLElement>('.xp-shutbtn')];
  const title = d.querySelector('.xp-shutdlg__h span');
  const cancelBtn = d.querySelector('.xp-btn');
  cancelBtn?.addEventListener('click', cancel);
  const paintTexts = (): void => {
    if (title) title.textContent = isOff ? L('turnOffTitle') : L('logOffTitle');
    buttons.forEach((b, i) => {
      const label = b.querySelector('span:last-child');
      const key = choices[i]?.[3];
      if (label && key) label.textContent = L(key);
    });
    if (cancelBtn) cancelBtn.textContent = L('cancel');
  };
  paintTexts();
  translated.set(d, paintTexts);
  dialogKey = (e) => {
    if (e.key !== 'Escape') return false;
    cancel();
    return true;
  };
  // the screen greys first, then the dialog comes up
  void run(lifetime(), async (signal) => {
    await wait(D(150), signal);
    if (!block.isConnected) return; // cancelled meanwhile
    R.root.appendChild(d);
    buttons[1]?.focus({ preventScroll: true });
  });
}
export const turnOffDialog = (): void => {
  shutdownDialog('off');
};
export const logOffDialog = (): void => {
  shutdownDialog('logoff');
};

function sysAction(a: ShutChoice): void {
  const steps: Record<ShutChoice, (signal: AbortSignal) => Promise<void>> = {
    standby: standBy,
    off: powerOff,
    restart,
    switch: (signal) => logOff(false, signal),
    logoff: (signal) => logOff(true, signal),
  };
  void run(lifetime(), steps[a]);
}

/* ------------------------------------------------------------------ turning off, restarting, logging off */

async function savingScreen(text: StringKey, ms: number, signal: AbortSignal): Promise<HTMLDivElement> {
  const ov = overlay('xp-welcome xp-saving', () => savingHTML(text));
  await wait(D(ms), signal);
  return ov;
}

/** The CRT switching off: the picture collapses to a line, then to a dot that fades. */
async function crtOff(target: HTMLElement, signal: AbortSignal): Promise<void> {
  if (reduced()) return;
  const dot = h('div', 'xp-crtdot');
  await animate(
    target,
    [
      { transform: 'none', filter: 'brightness(1)' },
      { transform: 'scale(1, .004)', filter: 'brightness(3)' },
    ],
    160,
    'ease-in',
  );
  await animate(
    target,
    [
      { transform: 'scale(1, .004)', filter: 'brightness(3)' },
      { transform: 'scale(0, .004)', filter: 'brightness(4)' },
    ],
    140,
    'ease-in',
  );
  checkAlive(signal);
  dom().root.appendChild(dot);
  await animate(
    dot,
    [
      { opacity: 1, transform: 'scale(1)' },
      { opacity: 0, transform: 'scale(.4)' },
    ],
    300,
    'ease-out',
  );
  dot.remove();
}

async function powerOff(signal: AbortSignal): Promise<void> {
  const release = beginBusy();
  sound('shutdown');
  const ov = await savingScreen('savingSettings', 900, signal);
  const R = dom();
  const black = h('div', 'xp-ov xp-black');
  R.root.insertBefore(black, ov);
  await crtOff(ov, signal);
  checkAlive(signal);
  closeAll();
  drop(ov);
  R.screen.classList.remove('xp--grey');
  release();
  markBooted(false);
  const wasOpen = S.open;
  after(400, signal, () => {
    black.remove();
  });
  try {
    S.opts?.onExit('off'); // the host knows the screen is black now
  } catch (e) {
    console.error(e);
  }
  if (S.open && wasOpen) host?.closeDesktop({ instant: true });
}

async function restart(signal: AbortSignal): Promise<void> {
  const release = beginBusy();
  sound('shutdown');
  const ov = await savingScreen('savingSettings', 900, signal);
  closeAll();
  dom().screen.classList.remove('xp--grey');
  const black = h('div', 'xp-ov xp-black');
  dom().root.appendChild(black);
  drop(ov);
  release();
  S.booted = false;
  await wait(D(700), signal);
  black.remove();
  await bootSteps(false, signal);
}

/** Log Off (closing the apps) or Switch User (keeping them): the log-on screen. */
async function logOff(closeApps: boolean, signal: AbortSignal): Promise<void> {
  const release = beginBusy();
  sound('shutdown');
  const ov = await savingScreen(closeApps ? 'loggingOff' : 'savingSettings', 900, signal);
  if (closeApps) closeAll();
  dom().screen.classList.remove('xp--grey');
  preDesktop(true);
  const login = overlay('xp-welcome xp-login', loginHTML);
  drop(ov);
  release();
  // the screen repaints on a language switch, so the clicks are caught on the screen, not on its buttons
  let chosen = false;
  login.addEventListener('click', (e) => {
    const t = e.target instanceof Element ? e.target : null;
    if (chosen || !t) return;
    if (t.closest('.xp-login__off')) {
      chosen = true;
      drop(login);
      void run(signal, powerOff);
    } else if (t.closest('.xp-login__user')) {
      chosen = true;
      void run(signal, (s) => logOn(login, s));
    }
  });
}

/** The owner's tile was clicked on the log-on screen: "loading your settings", then the desktop. */
async function logOn(login: HTMLElement, signal: AbortSignal): Promise<void> {
  sound('click');
  login.querySelector('.xp-login__user')?.classList.add('xp--chosen');
  const release = beginBusy();
  await wait(D(250), signal);
  show(login, () => welcomeHTML('loadingSettings'));
  await wait(D(900), signal);
  release();
  fadeOut(login, signal);
  reveal(true);
}

async function standBy(signal: AbortSignal): Promise<void> {
  dom().screen.classList.remove('xp--grey');
  const ov = overlay('xp-black xp-standby', () => `<span>${esc(L('standingBy'))}</span>`);
  sound('shutdown');
  await wait(600, signal);
  await pressOrKey(ov);
  sound('crtOn');
  ov.classList.add('xp--fadeout');
  await wait(D(500), signal);
  drop(ov);
}

/* ------------------------------------------------------------------ the blue screen */

export function bsod(): void {
  void run(lifetime(), bsodSteps);
}

async function bsodSteps(signal: AbortSignal): Promise<void> {
  if (dom().root.querySelector('.xp-bsod')) return;
  closePopups('start', 'menus');
  clearBalloons();
  sound('error');
  const ov = overlay(
    'xp-bsod',
    () => `${esc(L('bsod'))}<span>${esc(L('bsodKey'))} <span class="xp-caret">_</span></span>`,
  );
  const release = beginBusy();
  await wait(700, signal);
  await pressOrKey(ov, (e) => {
    e.preventDefault();
    e.stopPropagation();
  });
  closeAll();
  const black = h('div', 'xp-ov xp-black');
  dom().root.appendChild(black);
  drop(ov);
  release();
  S.booted = false;
  await wait(D(600), signal);
  black.remove();
  await bootSteps(true, signal);
}
