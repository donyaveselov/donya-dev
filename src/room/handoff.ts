/* Sitting down at the PC, with no overlay tricks:
   1. The camera flies to the monitor and stops head-on, zoomed so that the glass COVERS the window (its edges end up
      just outside the page, like walking up close to a screen). Until then the only thing on the monitor is its own
      3D texture.
   2. In that last frame the page shows nothing but the glass, i.e. the monitor's canvas stretched over the glass and
      cropped by the window. The desktop opens with exactly that picture: the same canvas, in a box with the glass's
      proportions, covering the window the same way. So the switch from 3D to the real desktop changes no pixel.
   3. Then the desktop does what a computer would: a game or the terminal minimizes to the taskbar, a screen saver
      is dismissed (the owner is away), and the desktop underneath is live.
   The minimize happens ON THE MONITOR, at the very start of the flight: the picture (terminal, game, screen saver)
   folds into the taskbar of a desktop painted onto the glass from the real one (desk-snapshot.ts). When the camera
   arrives the painted desktop is swapped for the real one. Leaving plays the same in reverse. */
import { CanvasTexture, Vector3 } from 'three';
import type { Material, Mesh, MeshBasicMaterial, Object3D, OrthographicCamera } from 'three';
import type { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { DESKTOP_DOM } from '../shared/desktop';
import type { RoomDesktop, RoomMountOptions, RoomOpenOptions } from '../shared/desktop';
import { ramp } from './lighting';
import { isMesh } from './materials';
import type { Monitors, Side } from './monitors';
import { screenFrame } from './monitors';
import { cloneM, mdata, psx } from './psx';
import { deskSnapshot, paintDesk, taskButton } from './desk-snapshot';
import type { DeskSnapshot } from './desk-snapshot';
import { screenCanvasTexture } from './textures';
import { must } from './util';
import type { Status } from '../shared/types';
import { ctx2d } from './textures';

interface CamPose {
  p: Vector3;
  t: Vector3;
  z: number;
}

/** What the hand-off needs from the room. */
export interface HandOffHost {
  camera: OrthographicCamera;
  controls: OrbitControls;
  root: Object3D;
  monitors: Monitors;
  reducedMotion: boolean;
  /** the debug panel's slow-motion factor (1 = normal) */
  slow(): number;
  status(): Status;
  game(): { kind: string; name: string | null };
  /** the figures and the chair that melt away when the visitor sits down */
  atDesk(): Object3D[];
  /** what monitor i shows for the current status */
  screenPicture(i: number): CanvasTexture;
  /** the page-sized opencode canvas for the desktop window */
  readableCode(): HTMLCanvasElement;
  /** the desktop's mount options (language, clocks, callbacks) */
  mountOptions(): RoomMountOptions;
  lang(): RoomMountOptions['lang'];
  /** the room's own chrome: steps aside for the desktop ('pc'), starts to come back ('leaving'), is back ('room') */
  chrome(stage: 'pc' | 'leaving' | 'room'): void;
  /** relights the room for the status (puts the right figure back) */
  relight(): void;
  /** no desktop script on the page: the old projects drawer */
  fallback(): void;
}

/** The painted glass during the hand-off. */
interface Hand {
  glass: MeshBasicMaterial;
  /** 0 = the status picture, 1 = the desktop with the picture minimized */
  paint(k: number): void;
  /** after a shutdown: the monitor is black and the status picture comes up on it */
  fromBlack(a: number): void;
  reSnap(): void;
  setSource(p: HTMLCanvasElement): void;
}

interface Seat extends CamPose {
  /** the desktop covers the whole window: nothing to draw */
  covered: boolean;
  hand: Hand | null;
}

/* Fading objects in and out: each mesh gets its own transparent copy of its material for the duration (materials are
   shared across the room, e.g. the chair's black is also the desk legs'), and the original comes back at full
   opacity. */
interface FadeState {
  base: Material | Material[];
  fade: Material[];
  opacity: number[];
}
const fadeStates = new WeakMap<Mesh, FadeState>();
function fadeObjs(objs: readonly Object3D[], a: number): void {
  for (const root of objs) {
    root.traverse((m) => {
      if (!isMesh(m)) return;
      let st = fadeStates.get(m);
      if (!st) {
        const base = m.material;
        const fade = (Array.isArray(base) ? base : [base]).map((x) => {
          const c = cloneM(x);
          c.transparent = true;
          return c;
        });
        st = { base, fade, opacity: fade.map((x) => x.opacity) };
        fadeStates.set(m, st);
      }
      if (a >= 1) {
        m.material = st.base;
        return;
      }
      m.material = Array.isArray(st.base) ? st.fade : must(st.fade[0]);
      st.fade.forEach((x, i) => {
        x.opacity = (st.opacity[i] ?? 1) * a;
        x.depthWrite = a > 0.6;
      });
    });
    root.visible = a > 0.002;
  }
}

const easeInOutCubic = (k: number): number => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);

export class HandOff {
  /** set while at the PC (and during both flights) */
  private seat: Seat | null = null;
  private xpRoot: HTMLElement | null = null;
  private mounted = false;

  constructor(
    private readonly host: HandOffHost,
    private readonly desktop: () => RoomDesktop | null,
  ) {}

  get atPC(): boolean {
    return !!this.seat;
  }

  /** The desktop covers the window: the room need not draw. */
  get covered(): boolean {
    return !!this.seat?.covered;
  }

  private tweenCam(to: CamPose, dur: number, done: () => void, tick?: (k: number) => void): void {
    const { camera, controls } = this.host;
    const from = { p: camera.position.clone(), t: controls.target.clone(), z: camera.zoom };
    const t0 = performance.now();
    const lz0 = Math.log(from.z);
    const lz1 = Math.log(to.z);
    controls.enabled = false;
    const step = (): void => {
      // same clock as t0; the frame timestamp can run on another one
      const k = this.host.reducedMotion ? 1 : Math.min(1, (performance.now() - t0) / (dur * 1000));
      const e = easeInOutCubic(k);
      camera.position.lerpVectors(from.p, to.p, e);
      controls.target.lerpVectors(from.t, to.t, e);
      camera.zoom = Math.exp(lz0 + (lz1 - lz0) * e);
      camera.updateProjectionMatrix();
      camera.lookAt(controls.target);
      camera.updateMatrixWorld();
      tick?.(k);
      if (k < 1) requestAnimationFrame(step);
      else done();
    };
    step();
  }

  /**
   * The desktop shell is built ahead of time (invisible, full-size), so the click on a monitor starts the camera at
   * once instead of spending its first frames creating a few hundred elements.
   */
  ensureDesktop(): void {
    const desk = this.desktop();
    if (!desk) return;
    if (!this.xpRoot) {
      this.xpRoot = document.createElement('div');
      this.xpRoot.id = 'xp-root';
      document.body.appendChild(this.xpRoot);
    }
    this.xpRoot.style.cssText =
      'position:fixed;z-index:40;overflow:hidden;left:0;top:0;width:100%;height:100%;opacity:0;transform-origin:0 0;pointer-events:none;will-change:transform,opacity';
    if (!this.mounted) {
      desk.mount(this.xpRoot, this.host.mountOptions());
      this.mounted = true;
    }
  }

  /** Tells the mounted desktop about a language change. */
  setLang(lang: RoomMountOptions['lang']): void {
    if (this.mounted) this.desktop()?.setLang(lang);
  }

  sitDown(which: Side = 'L'): void {
    if (this.seat) return;
    const desk = this.desktop();
    if (!desk) {
      this.host.fallback();
      return;
    }
    const { camera, controls, monitors } = this.host;
    const mon = monitors.get(which);
    if (!mon) return;
    const mesh = mon.screen;
    monitors.settle(); // measure the glass at its real size, not mid hover-bounce
    const f = screenFrame(mesh, camera);
    const vh = camera.top - camera.bottom;
    const vw = camera.right - camera.left;
    const seat: Seat = {
      p: camera.position.clone(),
      t: controls.target.clone(),
      z: camera.zoom,
      covered: false,
      hand: null,
    };
    this.seat = seat;
    const haloBase = monitors.list.map((m) => m.halo.opacity);
    this.host.chrome('pc');
    const gone = [this.host.root.getObjectByName('Chair'), ...this.host.atDesk()].filter((o): o is Object3D => !!o);
    this.ensureDesktop();
    const xpRoot = must(this.xpRoot);
    xpRoot.style.opacity = '0';
    xpRoot.style.transform = 'none';
    xpRoot.style.pointerEvents = 'none';
    const st = this.host.status();
    const away = st === 'sleep' || st === 'outside';
    const right = which === 'R';
    const A = f.w / f.h;
    const pic = mesh.material.map?.image as HTMLCanvasElement;
    const game = this.host.game();
    const slow = this.host.slow();
    const dur = (this.host.reducedMotion ? 0.01 : 1.35) * slow;
    // the real desktop opens at once, already in its final state (window minimized, saver gone), invisible: it is
    // measured for the painted copy on the glass and shown when the camera arrives
    desk.setLang(this.host.lang());
    if (away) desk.open({ noBoot: true, instant: true });
    else {
      const opts: RoomOpenOptions = {
        game: {
          kind: st === 'play' && !right ? game.kind : 'term',
          name: st === 'play' ? (right ? 'YouTube' : (game.name ?? '')) : right ? 'code' : 'opencode',
          image: pic,
          live: true,
          frame: A,
          hold: 0,
          dismiss: 'minimize',
          after: st === 'work' && !right ? this.host.readableCode() : null,
        },
        noBoot: true,
        instant: true,
      };
      desk.open(opts);
    }

    const hc = document.createElement('canvas');
    hc.width = 1024;
    hc.height = Math.round(1024 / A);
    const ht = screenCanvasTexture(hc);
    const gx = ctx2d(hc);
    let snap: DeskSnapshot | null = null;
    let src = pic;
    const glass = mesh.material;
    requestAnimationFrame(() => {
      snap = deskSnapshot(this.xpRoot);
    });
    const snapT = setInterval(
      () => {
        if (!this.seat) {
          clearInterval(snapT);
          return;
        }
        snap = deskSnapshot(this.xpRoot) ?? snap;
      },
      250 * Math.max(1, slow / 4),
    );
    const reduced = this.host.reducedMotion;
    const paint = (k: number): void => {
      // mid-flight: the screen is big enough to see it fold, not yet the whole view
      const m = reduced ? 1 : ramp(0.38, 0.72, k);
      if (!snap) {
        gx.drawImage(src, 0, 0, hc.width, hc.height);
        ht.needsUpdate = true;
        return;
      }
      const L = paintDesk(hc, snap, A);
      if (snap.task && !away) {
        const tb = L.R2(snap.task);
        if (m < 1) {
          // XP's own minimize: a few hard steps from the full picture down to the taskbar button
          const q = Math.floor(m * 9) / 9;
          const e = q * q * (3 - 2 * q);
          const fx = tb[0] * e;
          const fy = tb[1] * e;
          const fw = hc.width + (tb[2] - hc.width) * e;
          const fh = hc.height + (tb[3] - hc.height) * e;
          if (q < 0.34) gx.drawImage(src, fx, fy, fw, fh);
          else taskButton(gx, [fx, fy, fw, Math.max(tb[3], fh * 0.12)], snap, L.s, snap.taskText);
        }
      } else if (m < 1) {
        // the saver simply fades out
        gx.globalAlpha = 1 - m;
        gx.drawImage(src, 0, 0, hc.width, hc.height);
        gx.globalAlpha = 1;
      }
      ht.needsUpdate = true;
    };
    paint(0);
    glass.map = ht;
    mdata(glass).hand = true;
    seat.hand = {
      glass,
      paint,
      fromBlack(a) {
        gx.fillStyle = '#000';
        gx.fillRect(0, 0, hc.width, hc.height);
        gx.globalAlpha = a;
        gx.drawImage(src, 0, 0, hc.width, hc.height);
        gx.globalAlpha = 1;
        ht.needsUpdate = true;
      },
      reSnap: () => {
        snap = deskSnapshot(this.xpRoot) ?? snap;
      },
      setSource(p) {
        src = p;
      },
    };
    const zoomTo = Math.max(vh / f.h, vw / f.w); // cover, not contain: the glass fills the window, nothing around it
    this.tweenCam(
      { p: f.c.clone().addScaledVector(f.n, 120), t: f.c.clone(), z: zoomTo },
      dur,
      () => {
        clearInterval(snapT);
        xpRoot.style.opacity = '1'; // the one and only switch, on a matching frame
        xpRoot.style.pointerEvents = '';
        // keyboard (language hotkeys, menus) goes to the desktop right away
        xpRoot.querySelector<HTMLElement>(DESKTOP_DOM.root)?.focus({ preventScroll: true });
        requestAnimationFrame(() => {
          if (this.seat) this.seat.covered = true;
        });
      },
      (k) => {
        paint(k);
        fadeObjs(gone, 1 - ramp(0.1, 0.34, k)); // the chair and the owner melt away instead of popping out
        // the glow would wash the picture out up close and break the matching frame
        monitors.list.forEach((m, i) => {
          m.halo.opacity = (haloBase[i] ?? 0) * (1 - ramp(0.55, 0.95, k));
        });
        psx.fx = 1 - ramp(0.45, 0.9, k); // the PS1 look melts away as the camera arrives: at 0 the frame is drawn directly
      },
    );
  }

  standUp(how?: string): void {
    const back = this.seat;
    if (!back) return;
    const off = how === 'off';
    const { controls, monitors } = this.host;
    let restored = false;
    let again: Object3D[] = [];
    // puts the right figure back, still fully transparent, then it fades in
    const restore = (): void => {
      if (restored) return;
      restored = true;
      this.host.relight();
      again = [this.host.root.getObjectByName('Chair'), ...this.host.atDesk()].filter((o): o is Object3D => !!o);
      fadeObjs(again, 0);
    };
    this.host.chrome('leaving');
    back.covered = false;
    const xpRoot = this.xpRoot;
    if (xpRoot) xpRoot.style.pointerEvents = 'none';
    // the glass shows the desktop as it is now (measured before it closes), and the status picture unfolds from the
    // taskbar on the way out: the sit-down minimize played backwards, so nothing on the monitor ever switches at once
    const hand = back.hand;
    const hi = hand ? monitors.indexOf(hand.glass) : -1;
    if (hand) {
      hand.setSource(this.host.screenPicture(hi).image as HTMLCanvasElement);
      if (off) hand.fromBlack(0);
      else {
        hand.reSnap();
        hand.paint(1);
      }
    }
    const slow = this.host.slow();
    // the screen goes back to what the monitor shows (the camera has not moved yet), then the camera pulls away
    if (xpRoot) {
      xpRoot.style.transition = 'opacity ' + String(0.35 * slow) + 's ease';
      xpRoot.style.opacity = '0';
    }
    setTimeout(
      () => {
        const desk = this.desktop();
        if (desk?.isOpen()) desk.close();
        if (xpRoot) xpRoot.style.transition = '';
        this.tweenCam(
          back,
          (this.host.reducedMotion ? 0.01 : 1.1) * slow,
          () => {
            restore();
            fadeObjs(again, 1);
            this.seat = null;
            controls.enabled = true;
            this.host.chrome('room');
            psx.fx = 1;
            if (hand) {
              // the live status texture, the same picture the last painted frame showed
              delete mdata(hand.glass).hand;
              hand.glass.map = this.host.screenPicture(hi);
            }
          },
          (k) => {
            if (hand) {
              if (off) hand.fromBlack(ramp(0.05, 0.5, k));
              else hand.paint(1 - k);
            }
            psx.fx = ramp(0.1, 0.55, k);
            if (k > 0.45) {
              restore();
              fadeObjs(again, ramp(0.45, 0.8, k));
            }
          },
        );
      },
      this.host.reducedMotion ? 0 : 380 * slow,
    );
  }
}
