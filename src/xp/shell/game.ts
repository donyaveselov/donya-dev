// The game hand-off: the desktop opens showing the host monitor's picture full screen (a game, the code editor or the
// screen saver), which then minimizes to the taskbar (or, for the saver, simply goes away).
import type { XPGame } from '../../shared/types';
import { showBalloon } from './balloon';
import { beginBusy, isBusy } from './busy';
import { D, animate, css, esc, h, reduced, sessGet, sessSet } from './dom';
import { hideIcons, layoutIcons } from './desktop-icons';
import { gameIcon } from './glyphs';
import { dom, S } from './state';
import { L } from './strings';
import { Win } from './window';

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

const fpsText = (kind: string | undefined, n: number): string => `${kind === 'cs' ? 'fps ' : 'FPS '}${String(n)}`;

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
  const fps = h('div', 'xp-game__fps', fpsText(g.kind, 110 + Math.round(Math.random() * 30)));
  if (g.kind === 'dota' || g.kind === 'cs' || g.kind === 'other') box.appendChild(fps);
  w.body.appendChild(box);
  const fpsT = window.setInterval(() => {
    fps.textContent = fpsText(g.kind, 112 + Math.round(Math.random() * 28));
  }, 500);
  // a live source (a canvas the host keeps drawing): mirror it every frame, so the window is the very picture on the
  // host's monitor and not a frozen copy of it
  let src: HTMLCanvasElement | null = g.image instanceof HTMLCanvasElement ? g.image : null;
  let liveOn = !!(g.live && src && media instanceof HTMLCanvasElement);
  // g.after: once the hand-off is over, the window shows this canvas instead (the host's copy in the window's own
  // shape), filling the window plainly: readable on a phone, where the monitor's wide picture would be cropped
  const useAfter = (): void => {
    if (!g.after || src === g.after) return;
    src = g.after;
    media.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;object-fit:fill;display:block';
  };
  const mctx = media instanceof HTMLCanvasElement ? media.getContext('2d') : null;
  const mirror = (): void => {
    if (!liveOn || w.closed) return;
    if (w.state !== 'min' && src && media instanceof HTMLCanvasElement) {
      try {
        if (media.width !== src.width || media.height !== src.height) {
          media.width = src.width;
          media.height = src.height;
        }
        mctx?.drawImage(src, 0, 0);
      } catch {
        liveOn = false;
      }
    }
    requestAnimationFrame(mirror);
  };
  mirror();
  w.cleanup = () => {
    clearInterval(fpsT);
    liveOn = false;
  };
  box.addEventListener('click', () => {
    if (w.state !== 'min' && !isBusy()) void w.minimize();
  });
  w.hooks.onEsc = () => void w.minimize();
  w.hooks.onRestore = () => {
    setTimeout(() => {
      const hint = h('div', 'xp-game__hint', esc(L('gameHint')));
      box.appendChild(hint);
      setTimeout(() => {
        hint.classList.add('xp--out');
        setTimeout(() => {
          hint.remove();
        }, 400);
      }, 2200);
    }, D(220));
  };
  w.hooks.onMinimize = () => {
    setTimeout(() => {
      layoutIcons(false);
    }, 0);
  };
  w.focus();
  if (instant) {
    void w.minimize(true);
    useAfter();
    return;
  }
  R.root.classList.add('xp--gamehold');
  hideIcons(true);
  // the host may ask to keep it up longer, e.g. until its camera has arrived; 0 means the default
  // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
  const hold = reduced() ? 400 : g.hold || 900;
  const release = beginBusy();
  setTimeout(
    () => {
      if (!reduced())
        void animate(
          box,
          [{ transform: 'translate(2px, 1px)' }, { transform: 'translate(2px, 1px)' }],
          34,
          'linear',
        ).then((a) => {
          a?.cancel();
        });
    },
    Math.min(700, hold - 60),
  );
  setTimeout(() => {
    R.root.classList.remove('xp--gamehold');
    setTimeout(() => {
      release();
      if (w.closed) return;
      if (g.dismiss === 'close') {
        // a screen saver: it simply goes away and the desktop is there
        hideIcons(false);
        layoutIcons(true);
        box.style.transition = `opacity ${String(D(450))}ms ease`;
        box.style.opacity = '0';
        setTimeout(() => {
          if (!w.closed) w.close(true);
        }, D(470));
        return;
      }
      void w.minimize();
      useAfter(); // from now on (restored from the taskbar) the window shows the readable copy
      setTimeout(() => {
        hideIcons(false);
        layoutIcons(true);
      }, D(260));
      if (!sessGet('gametip')) {
        sessSet('gametip', '1');
        setTimeout(() => {
          if (S.open) showBalloon({ title: L(g.kind === 'term' ? 'appMin' : 'gameMin'), text: L('gameMinText', name) });
        }, D(1500));
      }
    }, D(120));
  }, hold);
}
