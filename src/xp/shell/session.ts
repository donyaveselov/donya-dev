// Boot and log-on, the shutdown dialog, Turn Off / Restart / Log Off / Stand By, and the blue screen.
import { status } from './clock';
import { D, animate, esc, h, now, on, reduced, reflow, sessGet, sessSet, wait } from './dom';
import { localPt } from './geometry';
import { ICON, wordmark } from './glyphs';
import { showBalloon, clearBalloons } from './balloon';
import { onLang } from './lang';
import { closePopups } from './popups';
import { sound, unlockSound } from './sound';
import { dom, S } from './state';
import { L, PC_NAME, tr, USER } from './strings';
import { closeAll } from './window';

/** What the session screens need from the desktop above them; desktop.ts provides it on mount. */
export interface SessionHost {
  closeDesktop(o: { instant?: boolean }): void;
  layoutIcons(stagger: boolean): void;
}

let host: SessionHost | null = null;

/** Connects the session to its desktop; the returned function disconnects it. */
export function bindSession(to: SessionHost): () => void {
  host = to;
  const offLang = onLang(() => {
    const p = S.loginEl?.isConnected ? S.loginEl.querySelector('p') : null;
    if (p) p.textContent = L('toBegin');
  });
  return () => {
    offLang();
    host = null;
  };
}

function overlay(cls: string, html = ''): HTMLDivElement {
  const o = h('div', `xp-ov ${cls}`, html);
  dom().root.appendChild(o);
  return o;
}

/** A sequence of waits that one "skip" finishes at once. */
function seq(): { wait(ms: number): Promise<void>; skip(): void; readonly skipped: boolean } {
  let sk = false;
  const pend: (() => void)[] = [];
  return {
    wait(ms) {
      if (sk) return Promise.resolve();
      return new Promise((r) => {
        const t = setTimeout(r, ms);
        pend.push(() => {
          clearTimeout(t);
          r();
        });
      });
    },
    skip() {
      if (sk) return;
      sk = true;
      for (const f of pend.splice(0)) f();
    },
    get skipped() {
      return sk;
    },
  };
}

function userTile(cls = ''): string {
  return `<button class="xp-login__user ${cls}" tabindex="-1"><span class="xp-start__pic">${ICON.avatar}</span><span><span class="xp-login__name">${esc(tr(USER))}</span><small>${esc(L('account'))}</small></span></button>`;
}

const BANDS_T = '<div class="xp-welcome__band xp-welcome__band--t"></div>';
const BANDS_B = '<div class="xp-welcome__band xp-welcome__band--b"></div>';

function welcomeHTML(line: string): string {
  return `${BANDS_T}<div class="xp-welcome__mid"><div class="xp-welcome__l"><div class="xp-welcome__logo">${ICON.logo}</div><div class="xp-welcome__w">${esc(L('welcome'))}</div></div><div class="xp-login__div"></div><div class="xp-welcome__r">${userTile('xp--static')}<div class="xp-welcome__line">${esc(line)}</div></div></div>${BANDS_B}`;
}

export function preDesktop(v: boolean): void {
  dom().root.classList.toggle('xp--pre', v);
}

const markBooted = (v: boolean): void => {
  S.booted = v;
  sessSet('booted', v ? '1' : '0');
};

/** Power-on: (wake from stand-by while the owner sleeps,) the boot screen, (the lock screen while he is out,) welcome. */
export async function boot(fast = false): Promise<void> {
  if (S.busy) return;
  S.busy = true;
  preDesktop(true);
  let sq = seq();
  const ov = overlay(
    'xp-boot',
    `<div class="xp-crtline"></div><div class="xp-boot__in"><div class="xp-boot__logo"><div class="xp-boot__mark">${ICON.logo}</div>${wordmark(true)}</div><div class="xp-boot__bar"><i></i><i></i><i></i></div></div>` +
      `<div class="xp-boot__foot"><span>${esc(L('copyright'))}</span><span class="xp-boot__dev"></span></div><div class="xp-boot__skip">${esc(L('skip'))}</div>`,
  );
  const st = status();
  const dev = ov.querySelector('.xp-boot__dev');
  if (dev) dev.textContent = `${PC_NAME} · ${L(`statusLine_${st}`)}`;
  const skipEl = ov.querySelector('.xp-boot__skip');
  const root = dom().root;

  if (!fast && st === 'sleep') {
    // the owner is asleep: the computer is in stand-by, wake it first (the wake gesture also unlocks audio)
    ov.classList.add('xp--sleep');
    if (skipEl) skipEl.textContent = S.touch ? L('sleepScreenTouch') : L('sleepScreen');
    await new Promise<void>((res) => {
      const t0 = now();
      let sx: { x: number; y: number } | null = null;
      const wake = (e: Event): void => {
        if (now() - t0 < 300) return;
        if (e instanceof PointerEvent && e.type === 'pointermove') {
          const q = localPt(e);
          if (!sx) {
            sx = q;
            return;
          }
          if (Math.abs(q.x - sx.x) + Math.abs(q.y - sx.y) < 12) return;
        }
        for (const f of offs) f();
        unlockSound();
        sound('crtOn');
        ov.classList.remove('xp--sleep');
        if (skipEl) skipEl.textContent = L('skip');
        res();
      };
      const offs = [on(ov, 'pointermove', wake), on(ov, 'pointerdown', wake), on(root, 'keydown', wake)];
    });
  }
  const offK = on(root, 'keydown', () => {
    sq.skip();
  });
  const offP = on(ov, 'pointerdown', () => {
    unlockSound();
    sq.skip();
  });
  if (reduced()) {
    ov.classList.add('xp--on');
    await sq.wait(300);
  } else {
    await sq.wait(200);
    ov.classList.add('xp--on');
    sound('crtOn');
    await sq.wait(fast ? 600 : 1100);
  }
  if (!fast && st === 'outside') {
    // the owner is out: a locked screen with a guest log-on
    const lk = overlay(
      'xp-welcome xp-login xp-lock',
      `${BANDS_T}<div class="xp-welcome__mid"><div class="xp-login__l"><div class="xp-welcome__logo">${ICON.logo}</div>${wordmark(true)}<p><b>${esc(L('locked'))}</b><br>${esc(L('lockedWhy'))}</p></div><div class="xp-login__div"></div><div class="xp-welcome__r"><button class="xp-login__user xp-login__guest" tabindex="-1"><span class="xp-start__pic">${ICON.avatar}</span><span><span class="xp-login__name">${esc(L('guest'))}</span><small>${esc(tr(USER))} · ${esc(L('statusLine_outside'))}</small></span></button></div></div>${BANDS_B}`,
    );
    ov.remove();
    offK();
    offP();
    await new Promise<void>((res) => {
      const user = lk.querySelector<HTMLElement>('.xp-login__user');
      const go = (): void => {
        offA();
        offB();
        unlockSound();
        sound('click');
        user?.classList.add('xp--chosen');
        setTimeout(() => {
          lk.remove();
          res();
        }, D(250));
      };
      const offA = user ? on(user, 'click', go) : (): void => undefined;
      const offB = on(root, 'keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') go();
      });
    });
    sq = seq();
  }
  let wel: HTMLDivElement | null = null;
  if (!sq.skipped) {
    wel = overlay('xp-welcome', welcomeHTML(L('loadingSettings')));
    ov.remove();
    const s = sq;
    on(wel, 'pointerdown', () => {
      s.skip();
    });
    await sq.wait(reduced() ? 300 : 900);
  }
  offK();
  offP();
  ov.remove();
  S.busy = false;
  markBooted(true);
  if (wel) {
    const w = wel;
    w.classList.add('xp--fadeout');
    setTimeout(
      () => {
        w.remove();
      },
      D(220) + 20,
    );
  }
  reveal(true);
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
    setTimeout(() => {
      if (S.open && !S.busy)
        showBalloon({ title: L('welcomeBalloonT'), text: S.touch ? L('welcomeBalloonTouch') : L('welcomeBalloon') });
    }, D(1400));
  }
}

type ShutChoice = 'standby' | 'off' | 'restart' | 'switch' | 'logoff';

function shutdownDialog(kind: 'off' | 'logoff'): void {
  const R = dom();
  if (S.busy || R.root.querySelector('.xp-shutdlg')) return;
  closePopups('start', 'menus');
  R.screen.classList.add('xp--grey');
  const isOff = kind === 'off';
  const d = h(
    'div',
    'xp-shutdlg',
    `<div class="xp-shutdlg__h"><span>${esc(isOff ? L('turnOffTitle') : L('logOffTitle'))}</span><span class="xp-shutdlg__logo">${ICON.logo}</span></div><div class="xp-shutdlg__b"></div><div class="xp-shutdlg__f"><button class="xp-btn">${esc(L('cancel'))}</button></div>`,
  );
  const body = d.querySelector('.xp-shutdlg__b');
  const choices: [ShutChoice, string, string, string][] = isOff
    ? [
        ['standby', 'amber', ICON.standby, L('standBy')],
        ['off', 'red', ICON.ginaOff, L('shutDown')],
        ['restart', 'green', ICON.restart, L('restart')],
      ]
    : [
        ['switch', 'green', ICON.ginaSwitch, L('switchUser')],
        ['logoff', 'amber', ICON.ginaLogoff, L('logOff')],
      ];
  const holder = h('div', 'xp-shutblock');
  R.root.appendChild(holder);
  const done = (): void => {
    d.remove();
    holder.remove();
    S.dlgKey = null;
  };
  const cancel = (): void => {
    done();
    R.screen.classList.remove('xp--grey');
    sound('click');
  };
  for (const [action, color, icon, label] of choices) {
    const b = h(
      'button',
      'xp-shutbtn',
      `<span class="xp-shutbtn__i xp--${color}">${icon}</span><span>${esc(label)}</span>`,
    );
    b.addEventListener('click', () => {
      done();
      sysAction(action);
    });
    body?.appendChild(b);
  }
  d.querySelector('.xp-btn')?.addEventListener('click', cancel);
  holder.addEventListener('pointerdown', (e) => {
    e.stopPropagation();
  });
  S.dlgKey = (e) => {
    if (e.key !== 'Escape') return false;
    cancel();
    return true;
  };
  setTimeout(() => {
    R.root.appendChild(d);
    d.querySelectorAll<HTMLElement>('.xp-shutbtn')[1]?.focus({ preventScroll: true });
  }, D(150));
}
export const turnOffDialog = (): void => {
  shutdownDialog('off');
};
export const logOffDialog = (): void => {
  shutdownDialog('logoff');
};

function sysAction(a: ShutChoice): void {
  if (a === 'standby') {
    dom().screen.classList.remove('xp--grey');
    standBy();
  } else if (a === 'off') void powerOff();
  else if (a === 'restart') void restart();
  else void logOff(a === 'logoff');
}

async function savingScreen(text: string, ms: number): Promise<HTMLDivElement> {
  const ov = overlay(
    'xp-welcome xp-saving',
    `${BANDS_T}<div class="xp-welcome__mid xp--center"><div class="xp-welcome__logo">${ICON.logo}</div><div class="xp-saving__t">${esc(text)}</div></div>${BANDS_B}`,
  );
  await wait(D(ms));
  return ov;
}

/** The CRT switching off: the picture collapses to a line, then to a dot that fades. */
async function crtOff(target: HTMLElement): Promise<void> {
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

async function powerOff(): Promise<void> {
  S.busy = true;
  sound('shutdown');
  const ov = await savingScreen(L('savingSettings'), 900);
  const R = dom();
  const black = h('div', 'xp-ov xp-black');
  R.root.insertBefore(black, ov);
  await crtOff(ov);
  closeAll();
  ov.remove();
  R.screen.classList.remove('xp--grey');
  S.busy = false;
  markBooted(false);
  const wasOpen = S.open;
  setTimeout(() => {
    black.remove();
  }, 400);
  try {
    S.opts?.onExit('off'); // the host knows the screen is black now
  } catch (e) {
    console.error(e);
  }
  if (S.open && wasOpen) host?.closeDesktop({ instant: true });
}

async function restart(): Promise<void> {
  S.busy = true;
  sound('shutdown');
  const ov = await savingScreen(L('savingSettings'), 900);
  closeAll();
  dom().screen.classList.remove('xp--grey');
  const black = overlay('xp-black');
  ov.remove();
  S.busy = false;
  S.booted = false;
  await wait(D(700));
  black.remove();
  await boot();
}

/** Log Off (closing the apps) or Switch User (keeping them): the log-on screen. */
async function logOff(closeApps: boolean): Promise<void> {
  S.busy = true;
  sound('shutdown');
  const ov = await savingScreen(closeApps ? L('loggingOff') : L('savingSettings'), 900);
  if (closeApps) closeAll();
  dom().screen.classList.remove('xp--grey');
  preDesktop(true);
  const lg = overlay(
    'xp-welcome xp-login',
    `${BANDS_T}<div class="xp-welcome__mid"><div class="xp-login__l"><div class="xp-welcome__logo">${ICON.logo}</div>${wordmark(true)}<p>${esc(L('toBegin'))}</p></div><div class="xp-login__div"></div><div class="xp-welcome__r">${userTile()}</div></div>` +
      `<div class="xp-welcome__band xp-welcome__band--b"><button class="xp-login__off" tabindex="-1"><span class="xp-shutbtn__i xp--red">${ICON.smOff}</span><span>${esc(L('turnOffBtn'))}</span></button><span class="xp-login__hint">${esc(L('afterLogOff'))}</span></div>`,
  );
  ov.remove();
  S.busy = false;
  const u = lg.querySelector('.xp-login__user');
  u?.addEventListener('click', () => {
    sound('click');
    u.classList.add('xp--chosen');
    S.busy = true;
    setTimeout(() => {
      lg.innerHTML = welcomeHTML(L('loadingSettings'));
      setTimeout(() => {
        S.busy = false;
        lg.classList.add('xp--fadeout');
        setTimeout(
          () => {
            lg.remove();
          },
          D(220) + 20,
        );
        reveal(true);
      }, D(900));
    }, D(250));
  });
  lg.querySelector('.xp-login__off')?.addEventListener('click', () => {
    lg.remove();
    void powerOff();
  });
  S.loginEl = lg;
}

function standBy(): void {
  const ov = overlay('xp-black xp-standby', `<span>${esc(L('standingBy'))}</span>`);
  sound('shutdown');
  setTimeout(() => {
    const wake = (): void => {
      off();
      offK();
      sound('crtOn');
      ov.classList.add('xp--fadeout');
      setTimeout(() => {
        ov.remove();
      }, D(500));
    };
    const off = on(ov, 'pointerdown', wake);
    const offK = on(dom().root, 'keydown', wake);
  }, 600);
}

export function bsod(): void {
  const R = dom();
  if (R.root.querySelector('.xp-bsod')) return;
  closePopups('start', 'menus');
  clearBalloons();
  sound('error');
  const ov = overlay('xp-bsod');
  ov.textContent = L('bsod');
  ov.appendChild(h('span', '', `${esc(L('bsodKey'))} <span class="xp-caret">_</span>`));
  S.busy = true;
  setTimeout(() => {
    const go = (e: Event): void => {
      e.preventDefault();
      e.stopPropagation();
      off();
      offK();
      closeAll();
      const b = overlay('xp-black');
      ov.remove();
      S.busy = false;
      S.booted = false;
      setTimeout(() => {
        b.remove();
        void boot(true);
      }, D(600));
    };
    const off = on(ov, 'pointerdown', go);
    const offK = on(R.root, 'keydown', go);
  }, 700);
}
