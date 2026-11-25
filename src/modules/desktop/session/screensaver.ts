// Screen savers: the floating "Windows XD" logo (optionally driven by the host, to match the copy on its monitor) and
// a starfield. Any input after the first 400 ms stops them.
import { XP_ICO } from '../icons';
import { SAVER_BG } from '../../../enums/saver';
import { SAVER_LOGO } from '../store/constants';
import { clamp, D, h, now, on, reduced } from '../dom';
import { localPt } from '../windows/geometry';
import { closeMenus } from '../taskbar/menu';
import { dom, type SaverKind, S } from '../store/state';
import { Tip } from '../taskbar/tooltip';

interface Star {
  x: number;
  y: number;
  z: number;
}

let saverEl: HTMLDivElement | null = null;
let raf = 0;
let offs: (() => void)[] = [];

export const saverRunning = (): boolean => !!saverEl;

/** The 16:9 glass the host draws its saver on, of which this canvas (W x H) shows the centred part. */
function hostWindow(W: number, H: number, base: number): { k: number; fw: number; fh: number; bw: number; bh: number } {
  const A = 16 / 9;
  const V = W / H;
  const fw = V > A ? 1 : V / A;
  const fh = V > A ? A / V : 1;
  return { k: W / (base * fw), fw, fh, bw: base, bh: (base * 9) / 16 };
}

export function startSaver(kind: SaverKind = S.prefs.saver): void {
  if (saverEl || kind === 'none') return;
  closeMenus(0);
  Tip.hide();
  const cv = h('canvas');
  const c = cv.getContext('2d');
  if (!c) {
    // nothing is on screen yet: a saver that cannot draw must not come up as a blank overlay nothing dismisses
    console.warn('XP screen saver: no 2D canvas context');
    return;
  }
  const ov = h('div', 'xp-ov xp-saver');
  dom().root.appendChild(ov);
  saverEl = ov;
  ov.appendChild(cv);
  const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
  const W = S.w;
  const H = S.h;
  cv.width = Math.round(W * dpr);
  cv.height = Math.round(H * dpr);
  c.scale(dpr, dpr);
  const stars: Star[] = [];
  for (let i = 0; i < 220; i++)
    stars.push({ x: (Math.random() - 0.5) * W, y: (Math.random() - 0.5) * H, z: Math.random() * W });
  let lx = Math.random() * (W - SAVER_LOGO.w);
  let ly = Math.random() * (H - SAVER_LOGO.h);
  let vx = 1.2;
  let vy = 1;
  const t0 = now();
  const flag = new Image();
  flag.src = XP_ICO.logo;
  const base = S.opts?.saverPos ? S.opts.saverBase : undefined;
  const frame = (): void => {
    if (!saverEl) return;
    if (kind === 'stars') {
      c.fillStyle = 'rgba(0,0,0,.45)';
      c.fillRect(0, 0, W, H);
      const speed = reduced() ? 0.5 : 6;
      // one white fill, each star's brightness as the global alpha: no colour string per star per frame
      c.fillStyle = '#fff';
      for (const s of stars) {
        s.z -= speed;
        if (s.z <= 1) {
          s.x = (Math.random() - 0.5) * W;
          s.y = (Math.random() - 0.5) * H;
          s.z = W;
        }
        const k = 160 / s.z;
        const x = s.x * k + W / 2;
        const y = s.y * k + H / 2;
        const r = Math.max(0.4, 2.2 - (s.z / W) * 2.2);
        if (x < 0 || x > W || y < 0 || y > H) {
          s.z = 0;
          continue;
        }
        c.globalAlpha = Math.min(1, 1.2 - s.z / W);
        c.beginPath();
        c.arc(x, y, r, 0, 6.283);
        c.fill();
      }
      c.globalAlpha = 1;
    } else {
      c.fillStyle = SAVER_BG; // the room's monitors show the same deep blue
      c.fillRect(0, 0, W, H);
      // The host can drive the logo (saverPos -> {u, v}, 0..1 of the free travel) and give the width its own copy of
      // the saver is drawn at (saverBase): then this one matches it in place and in relative size, with no jump. The
      // host shows its saver on a 16:9 glass and this screen sits centred on that glass with its own proportions, so
      // this canvas is a window into the host's picture: same scale, shifted by the bars it does not cover.
      let k = 1;
      if (base) {
        const g = hostWindow(W, H, base);
        k = g.k;
        const uv = S.opts?.saverPos?.() ?? { u: 0, v: 0 };
        lx = uv.u * (g.bw - SAVER_LOGO.w) - (g.bw * (1 - g.fw)) / 2;
        ly = uv.v * (g.bh - SAVER_LOGO.h) - (g.bh * (1 - g.fh)) / 2;
      } else {
        lx += vx;
        ly += vy;
        if (lx < 0 || lx > W - SAVER_LOGO.w) {
          vx = -vx;
          lx = clamp(lx, 0, W - SAVER_LOGO.w);
        }
        if (ly < 0 || ly > H - SAVER_LOGO.h) {
          vy = -vy;
          ly = clamp(ly, 0, H - SAVER_LOGO.h);
        }
      }
      c.save();
      c.scale(k, k);
      if (flag.complete && flag.naturalWidth) {
        c.imageSmoothingQuality = 'high';
        c.drawImage(flag, lx, ly + 4, 70, (70 * flag.naturalHeight) / flag.naturalWidth);
      }
      c.textBaseline = 'alphabetic';
      c.fillStyle = '#fff';
      c.font = 'italic bold 34px "Trebuchet MS", Tahoma, sans-serif';
      c.fillText('Windows', lx + 80, ly + 54);
      const ww = c.measureText('Windows').width;
      c.fillStyle = '#F7941D';
      c.font = 'italic bold 20px "Trebuchet MS", Tahoma, sans-serif';
      c.fillText('XD', lx + 82 + ww, ly + 38);
      c.restore();
    }
    raf = requestAnimationFrame(frame);
  };
  frame();
  let sp: { x: number; y: number } | null = null;
  const stop = (e: Event): void => {
    if (e instanceof PointerEvent && e.type === 'pointermove') {
      const p = localPt(e);
      if (!sp) {
        sp = p;
        return;
      }
      if (Math.abs(p.x - sp.x) + Math.abs(p.y - sp.y) < 8) return;
    }
    if (now() - t0 < 400) return;
    stopSaver();
  };
  offs = [on(ov, 'pointermove', stop), on(ov, 'pointerdown', stop), on(dom().root, 'keydown', stop)];
}

export function stopSaver(): void {
  const el = saverEl;
  if (!el) return;
  cancelAnimationFrame(raf);
  for (const f of offs) f();
  offs = [];
  saverEl = null;
  el.classList.add('xp--fadeout');
  setTimeout(() => {
    el.remove();
  }, D(300));
  S.lastInput = now();
}
