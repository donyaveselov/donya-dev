// The game hand-off: the desktop opens showing the host monitor's picture full screen (a game, the code editor or the
// screen saver), which then minimizes to the taskbar (or, for the saver, simply goes away).
import type { XPGame } from '../../../types';
import { showBalloon } from '../taskbar/balloon';
import { beginBusy, isBusy } from './busy';
import { D, animate, css, esc, h, reduced, sessGet, sessSet } from '../dom';
import { hideIcons, layoutIcons } from '../desktop-icons';
import { gameIcon } from '../glyphs';
import { after, run, wait } from './seq';
import { dom, lifetime, S } from '../store/state';
import { L } from '../strings';
import { Win } from '../windows/window';

/** A copy of the host's picture: an <img> for a URL or image, a canvas (or its snapshot) for a canvas. */
function gameMedia(img: XPGame['image']): HTMLElement {
  if (!img) return h('div');
  if (typeof img === 'string') {
    const i = document.createElement('img');
    i.alt = '';
    i.src = img;
    i.draggable = false;
    return i;
  }
  if (img instanceof HTMLCanvasElement) {
    const c = document.createElement('canvas');
    c.width = img.width || 1;
    c.height = img.height || 1;
    try {
      c.getContext('2d')?.drawImage(img, 0, 0);
    } catch {
      try {
        const im = document.createElement('img');
        im.src = img.toDataURL();
        return im;
      } catch {
        /* a tainted canvas: keep the empty copy */
      }
    }
    return c;
  }
  const j = document.createElement('img');
  j.src = img.src;
  j.alt = '';
  return j;
}

const FPS_KINDS: readonly (string | undefined)[] = ['dota', 'cs', 'other'];
const fpsText = (kind: string | undefined, n: number): string => `${kind === 'cs' ? 'fps ' : 'FPS '}${String(n)}`;

/** A repeating job (a rAF loop, an interval) that only runs while it is wanted; `start` returns its stop. */
function pausable(start: () => () => void): (wanted: boolean) => void {
  let stop: (() => void) | null = null;
  return (wanted) => {
    if (wanted && !stop) stop = start();
    else if (!wanted && stop) {
      stop();
      stop = null;
    }
  };
}

let syncCurrent: (() => void) | null = null;
/** The desktop was opened or closed: the game's picture and fps counter only run while they can be seen. */
export function syncGame(): void {
  syncCurrent?.();
}

export function startGame(g: XPGame, instant = false): void {
  if (S.game && !S.game.closed) S.game.close(true);
  // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- an empty name is no name
  const name = g.name || 'Game';
  const w = new Win({
    kind: 'game',
    title: name,
    icon: gameIcon(g.kind),
    frameless: true,
    cover: true,
    resizable: false,
    maximizable: false,
  });
  S.game = w;
  const R = dom();
  const signal = lifetime();
  const box = h('div', `xp-game${g.kind === 'term' ? ' xp-game--term' : ''}`);
  const media = gameMedia(g.image);
  box.appendChild(media);
  // g.frame: the picture is the host monitor's own canvas, stretched over a glass of this aspect ratio and covering the
  // screen the way the host's camera ends up covering the window with that glass. Same box, same crop: the first frame
  // of this window is the last frame of the host's camera move.
  if (g.frame) {
    const W = S.w || R.root.clientWidth;
    const H = S.h || R.root.clientHeight;
    const A = g.frame;
    const [bw, bh] = W / H > A ? [W, W / A] : [H * A, H];
    media.style.inset = 'auto';
    css(media, {
      position: 'absolute',
      left: `${String((W - bw) / 2)}px`,
      top: `${String((H - bh) / 2)}px`,
      width: `${String(bw)}px`,
      height: `${String(bh)}px`,
      objectFit: 'fill',
    });
  }
  // the fps counter of a game (the code editor and the screen saver have none)
  const fps = FPS_KINDS.includes(g.kind)
    ? h('div', 'xp-game__fps', fpsText(g.kind, 110 + Math.round(Math.random() * 30)))
    : null;
  if (fps) box.appendChild(fps);
  w.body.appendChild(box);
  const fpsLoop = pausable(() => {
    const t = window.setInterval(() => {
      if (fps) fps.textContent = fpsText(g.kind, 112 + Math.round(Math.random() * 28));
    }, 500);
    return () => {
      clearInterval(t);
    };
  });
  // a live source (a canvas the host keeps drawing): mirror it every frame, so the window is the very picture on the
  // host's monitor and not a frozen copy of it
  let src: HTMLCanvasElement | null = g.image instanceof HTMLCanvasElement ? g.image : null;
  let live = !!(g.live && src && media instanceof HTMLCanvasElement);
  // g.after: once the hand-off is over, the window shows this canvas instead (the host's copy in the window's own
  // shape), filling the window plainly: readable on a phone, where the monitor's wide picture would be cropped
  const useAfter = (): void => {
    if (!g.after || src === g.after) return;
    src = g.after;
    media.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;object-fit:fill;display:block';
  };
  const mctx = media instanceof HTMLCanvasElement ? media.getContext('2d') : null;
  const mirrorLoop = pausable(() => {
    let raf = 0;
    const frame = (): void => {
      if (!src || !(media instanceof HTMLCanvasElement)) return;
      try {
        if (media.width !== src.width || media.height !== src.height) {
          media.width = src.width;
          media.height = src.height;
        }
        mctx?.drawImage(src, 0, 0);
      } catch {
        live = false; // the source went away (or got tainted): keep the last picture
        return;
      }
      raf = requestAnimationFrame(frame);
    };
    frame();
    return () => {
      cancelAnimationFrame(raf);
    };
  });
  // both loops rest while nobody can see the window: minimized, closed, or the desktop itself is closed
  const sync = (): void => {
    const visible = S.open && !w.closed && w.state !== 'min';
    mirrorLoop(visible && live);
    fpsLoop(visible && !!fps);
  };
  syncCurrent = sync;
  sync();
  w.cleanup = () => {
    mirrorLoop(false);
    fpsLoop(false);
    if (syncCurrent === sync) syncCurrent = null;
  };
  box.addEventListener('click', () => {
    if (w.state !== 'min' && !isBusy()) void w.minimize();
  });
  w.hooks.onEsc = () => void w.minimize();
  w.hooks.onRestore = () => {
    sync();
    void run(signal, async () => {
      await wait(D(220), signal);
      const hint = h('div', 'xp-game__hint', esc(L('gameHint')));
      box.appendChild(hint);
      await wait(2200, signal);
      hint.classList.add('xp--out');
      await wait(400, signal);
      hint.remove();
    });
  };
  w.hooks.onMinimize = () => {
    sync();
    after(0, signal, () => {
      layoutIcons(false);
    });
  };
  w.focus();
  if (instant) {
    void w.minimize(true);
    useAfter();
    return;
  }
  void run(signal, () => handOff(g, name, w, box, useAfter, signal));
}

/**
 * The hand-off itself: the picture holds the screen (with a one-frame jolt just before it lets go), then minimizes to
 * the taskbar (or, a screen saver, fades away) and the desktop's icons appear.
 */
async function handOff(
  g: XPGame,
  name: string,
  w: Win,
  box: HTMLElement,
  useAfter: () => void,
  signal: AbortSignal,
): Promise<void> {
  const root = dom().root;
  root.classList.add('xp--gamehold');
  hideIcons(true);
  // the host may ask to keep it up longer, e.g. until its camera has arrived; 0 means the default
  // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
  const hold = reduced() ? 400 : g.hold || 900;
  const release = beginBusy();
  after(Math.min(700, hold - 60), signal, () => {
    if (reduced()) return;
    void animate(box, [{ transform: 'translate(2px, 1px)' }, { transform: 'translate(2px, 1px)' }], 34, 'linear').then(
      (a) => {
        a?.cancel();
      },
    );
  });
  await wait(hold, signal);
  root.classList.remove('xp--gamehold');
  await wait(D(120), signal);
  release();
  if (w.closed) return;
  if (g.dismiss === 'close') {
    // a screen saver: it simply goes away and the desktop is there
    hideIcons(false);
    layoutIcons(true);
    box.style.transition = `opacity ${String(D(450))}ms ease`;
    box.style.opacity = '0';
    await wait(D(470), signal);
    w.close(true);
    return;
  }
  void w.minimize();
  useAfter(); // from now on (restored from the taskbar) the window shows the readable copy
  after(D(260), signal, () => {
    hideIcons(false);
    layoutIcons(true);
  });
  if (!sessGet('gametip')) {
    sessSet('gametip', '1');
    after(D(1500), signal, () => {
      if (S.open) showBalloon({ title: L(g.kind === 'term' ? 'appMin' : 'gameMin'), text: L('gameMinText', name) });
    });
  }
}
