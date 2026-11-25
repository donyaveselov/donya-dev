/* Sitting down at a monitor and standing up again, with no overlay tricks.
   Sitting down: the camera flies to the monitor and stops head-on, zoomed so that the glass covers the window. On the
   way the glass shows a painted copy of the real desktop (desk-snapshot.ts): the status picture (terminal, game) folds
   into its taskbar, or the screen saver fades out over it. The real desktop is already open underneath, invisible, in
   exactly that state, so showing it when the camera arrives changes no pixel.
   Standing up plays the same backwards. */
import { Vector3 } from 'three';
import type { CanvasTexture, Material, Mesh, MeshBasicMaterial, Object3D, OrthographicCamera, Texture } from 'three';
import type { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { DESKTOP_DOM, createDesktopRoot } from '../shared/desktop';
import type { RoomDesktop, RoomMountOptions, RoomOpenOptions } from '../shared/desktop';
import type { GameKind, Status } from '../shared/types';
import { CAMERA_DISTANCE } from './camera';
import { deskSnapshot, paintDesk, taskButton } from './desk-snapshot';
import type { DeskSnapshot } from './desk-snapshot';
import { nextPhase } from './handoff-phase';
import type { Phase } from './handoff-phase';
import { ramp } from './lighting';
import { isMesh } from './materials';
import type { Monitors, Side } from './monitors';
import { screenFrame } from './monitors';
import { cloneM, mdata, psx } from './psx';
import { ctx2d, screenCanvasTexture } from './textures';
import { must } from './util';

/** The flights, in seconds (times the debug panel's slow-motion factor). */
const FLIGHT_IN_S = 1.35;
const FLIGHT_OUT_S = 1.1;
/** With reduced motion the camera jumps: one frame. */
const FLIGHT_REDUCED_S = 0.01;
/** Standing up, the desktop first fades into the painted glass behind it. */
const DESKTOP_FADE_S = 0.35;
/** How long after the fade should have ended to stop waiting for its transitionend. */
const FADE_GRACE_MS = 30;
/** The painted glass's canvas width; its height follows the glass. */
const GLASS_W = 1024;
/** The desktop is re-measured for the painted copy while the camera flies (fonts and pictures may still arrive). */
const SNAPSHOT_EVERY_MS = 250;

/** A stretch of a flight, as shares of its progress (0 = take-off, 1 = arrival). */
type Stretch = readonly [from: number, to: number];
const over = ([from, to]: Stretch, k: number): number => ramp(from, to, k);

/** Flying in. */
const IN = {
  /** the picture folds into the taskbar mid-flight: the screen is big enough to see it, not yet the whole view */
  fold: [0.38, 0.72],
  /** the chair and the owner melt away instead of popping out */
  melt: [0.1, 0.34],
  /** the glow around the screens goes: up close it would wash the picture out and break the matching frame */
  glow: [0.55, 0.95],
  /** the PS1 look goes: on arrival the frame is drawn directly, pixel for pixel */
  ps1: [0.45, 0.9],
} as const satisfies Record<string, Stretch>;

/** Flying out. */
const OUT = {
  /** after a shutdown the status picture comes up on a black monitor */
  wake: [0.05, 0.5],
  ps1: [0.1, 0.55],
  /** the chair and the owner come back */
  figure: [0.45, 0.8],
} as const satisfies Record<string, Stretch>;

/* XP's own minimize: a few hard steps from the full picture down to the taskbar button. The first steps still show
   the picture, the rest a title bar (never thinner than the button, or this share of the shrinking frame). */
const FOLD_STEPS = 9;
const FOLD_PICTURE_UNTIL = 0.34;
const FOLD_BAR_SHARE = 0.12;

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
  game(): { kind: GameKind; name: string | null };
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
  /** the desktop module failed to load (a flaky network): tell the visitor */
  fallback(): void;
  /** loads the desktop module (once); false when it failed */
  loadDesktop(): Promise<boolean>;
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
  /** frees the painted glass's GPU texture once the monitor shows its own picture again */
  dispose(): void;
}

/** A visit to the desktop: where the camera came from, and the glass it flew into. */
interface Seat {
  from: CamPose;
  hand: Hand;
}

/** The canvas a screen texture draws from (the room's screen pictures all are canvases), or null. */
function canvasOf(tex: Texture | null): HTMLCanvasElement | null {
  const image: unknown = tex?.image;
  return image instanceof HTMLCanvasElement ? image : null;
}

/**
 * Fades an element out and calls `done` once: on its transitionend, or a moment after the fade should have ended if
 * the event never comes (a hidden tab, an element that was already transparent).
 */
function fadeOut(el: HTMLElement, seconds: number, done: () => void): void {
  if (seconds <= 0) {
    el.style.opacity = '0';
    setTimeout(done, 0);
    return;
  }
  const onEnd = (e: TransitionEvent): void => {
    if (e.target === el && e.propertyName === 'opacity') finish();
  };
  const finish = (): void => {
    clearTimeout(timer);
    el.removeEventListener('transitionend', onEnd);
    el.style.transition = '';
    done();
  };
  const timer = setTimeout(finish, seconds * 1000 + FADE_GRACE_MS);
  el.addEventListener('transitionend', onEnd);
  el.style.transition = `opacity ${String(seconds)}s ease`;
  el.style.opacity = '0';
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
  private phase: Phase = 'room';
  /** set while away from the room (phases in, seated, out) */
  private seat: Seat | null = null;
  /** the desktop covers the whole window: the room need not draw */
  private isCovered = false;
  private xpRoot: HTMLElement | null = null;
  private mounted = false;
  /** a click on a monitor while the desktop module is still loading: sit down once it is in */
  private waiting = false;

  constructor(
    private readonly host: HandOffHost,
    private readonly desktop: () => RoomDesktop | null,
  ) {}

  /** At the PC or on the way there or back: the camera and the monitors belong to the hand-off. */
  get atPC(): boolean {
    return this.phase !== 'room';
  }

  /** The desktop covers the window: the room need not draw. */
  get covered(): boolean {
    return this.isCovered;
  }

  private flightSeconds(normal: number): number {
    return (this.host.reducedMotion ? FLIGHT_REDUCED_S : normal) * this.host.slow();
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

  /** The chair and whoever sits at the desk: they fade out for the visitor and back in afterwards. */
  private deskCompany(): Object3D[] {
    return [this.host.root.getObjectByName('Chair'), ...this.host.atDesk()].filter((o): o is Object3D => !!o);
  }

  /**
   * The desktop shell is built ahead of time (invisible, full-size), so the click on a monitor starts the camera at
   * once instead of spending its first frames creating a few hundred elements.
   */
  ensureDesktop(): void {
    const desk = this.desktop();
    if (!desk) return;
    this.xpRoot ??= createDesktopRoot();
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

  /** What the desktop opens with: the monitor's own picture as a full-screen window, or nothing while the owner is away. */
  private openOptions(right: boolean, picture: HTMLCanvasElement, aspect: number): RoomOpenOptions {
    const st = this.host.status();
    if (st === 'sleep' || st === 'outside') return { noBoot: true, instant: true };
    const game = this.host.game();
    const playing = st === 'play';
    return {
      game: {
        kind: playing && !right ? game.kind : 'term',
        name: playing ? (right ? 'YouTube' : (game.name ?? '')) : right ? 'code' : 'opencode',
        image: picture,
        live: true,
        frame: aspect,
        hold: 0,
        dismiss: 'minimize',
        after: st === 'work' && !right ? this.host.readableCode() : null,
      },
      noBoot: true,
      instant: true,
    };
  }

  /**
   * Flies to a monitor and opens the desktop; `arrived` runs once the desktop is live. Does nothing unless the
   * visitor is in the room.
   */
  sitDown(which: Side = 'L', arrived?: (desk: RoomDesktop) => void): void {
    const flying = nextPhase(this.phase, 'sit');
    if (!flying || this.waiting) return;
    const desk = this.desktop();
    if (!desk) {
      this.waiting = true;
      void this.host.loadDesktop().then((ok) => {
        this.waiting = false;
        if (ok) this.sitDown(which, arrived);
        else this.host.fallback();
      });
      return;
    }
    const { camera, controls, monitors } = this.host;
    const mon = monitors.get(which);
    const pic = canvasOf(mon?.screen.material.map ?? null);
    if (!mon || !pic) return;
    const mesh = mon.screen;
    monitors.settle(); // measure the glass at its real size, not mid hover-bounce
    const f = screenFrame(mesh, camera);
    const vh = camera.top - camera.bottom;
    const vw = camera.right - camera.left;
    const from: CamPose = { p: camera.position.clone(), t: controls.target.clone(), z: camera.zoom };
    this.phase = flying;
    const haloBase = monitors.list.map((m) => m.halo.opacity);
    this.host.chrome('pc');
    const gone = this.deskCompany();
    this.ensureDesktop();
    const xpRoot = must(this.xpRoot);
    xpRoot.style.opacity = '0';
    xpRoot.style.transform = 'none';
    xpRoot.style.pointerEvents = 'none';
    const st = this.host.status();
    const away = st === 'sleep' || st === 'outside';
    const A = f.w / f.h;
    const slow = this.host.slow();
    // the real desktop opens at once, already in its final state (window minimized, saver gone), invisible: it is
    // measured for the painted copy on the glass and shown when the camera arrives
    desk.setLang(this.host.lang());
    desk.open(this.openOptions(which === 'R', pic, A));

    const hc = document.createElement('canvas');
    hc.width = GLASS_W;
    hc.height = Math.round(GLASS_W / A);
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
        if (this.phase !== 'in') {
          clearInterval(snapT);
          return;
        }
        snap = deskSnapshot(this.xpRoot) ?? snap;
      },
      SNAPSHOT_EVERY_MS * Math.max(1, slow / 4),
    );
    const reduced = this.host.reducedMotion;
    const paint = (k: number): void => {
      const m = reduced ? 1 : over(IN.fold, k);
      if (!snap) {
        gx.drawImage(src, 0, 0, hc.width, hc.height);
        ht.needsUpdate = true;
        return;
      }
      const L = paintDesk(hc, snap, A);
      if (snap.task && !away) {
        const tb = L.toGlass(snap.task);
        if (m < 1) {
          const q = Math.floor(m * FOLD_STEPS) / FOLD_STEPS;
          const e = q * q * (3 - 2 * q);
          const fx = tb[0] * e;
          const fy = tb[1] * e;
          const fw = hc.width + (tb[2] - hc.width) * e;
          const fh = hc.height + (tb[3] - hc.height) * e;
          if (q < FOLD_PICTURE_UNTIL) gx.drawImage(src, fx, fy, fw, fh);
          else taskButton(gx, [fx, fy, fw, Math.max(tb[3], fh * FOLD_BAR_SHARE)], snap, L.s, snap.taskText);
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
    const hand: Hand = {
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
      dispose() {
        ht.dispose();
        hc.width = hc.height = 0; // let the canvas's backing store go too
      },
    };
    this.seat = { from, hand };
    const zoomTo = Math.max(vh / f.h, vw / f.w); // cover, not contain: the glass fills the window, nothing around it
    this.tweenCam(
      { p: f.c.clone().addScaledVector(f.n, CAMERA_DISTANCE), t: f.c.clone(), z: zoomTo },
      this.flightSeconds(FLIGHT_IN_S),
      () => {
        clearInterval(snapT);
        this.phase = 'seated';
        xpRoot.style.opacity = '1'; // the one and only switch, on a matching frame
        xpRoot.style.pointerEvents = '';
        // keyboard (language hotkeys, menus) goes to the desktop right away
        xpRoot.querySelector<HTMLElement>(DESKTOP_DOM.root)?.focus({ preventScroll: true });
        requestAnimationFrame(() => {
          if (this.phase === 'seated') this.isCovered = true;
        });
        arrived?.(desk);
      },
      (k) => {
        paint(k);
        fadeObjs(gone, 1 - over(IN.melt, k));
        monitors.list.forEach((m, i) => {
          m.halo.opacity = (haloBase[i] ?? 0) * (1 - over(IN.glow, k));
        });
        psx.fx = 1 - over(IN.ps1, k);
      },
    );
  }

  /**
   * Leaves the desktop and flies back to where the camera was ('off': after Turn Off Computer, the monitor is black).
   * Does nothing unless the visitor is seated: a second call during the flight out is ignored.
   */
  standUp(how?: 'off'): void {
    const leaving = nextPhase(this.phase, 'stand');
    const seat = this.seat;
    const xpRoot = this.xpRoot;
    if (!leaving || !seat || !xpRoot) return;
    this.phase = leaving;
    const off = how === 'off';
    const { controls, monitors } = this.host;
    const { hand } = seat;
    let again: Object3D[] | null = null;
    // puts the right figure back, still fully transparent, then it fades in
    const restore = (): Object3D[] => {
      if (!again) {
        this.host.relight();
        again = this.deskCompany();
        fadeObjs(again, 0);
      }
      return again;
    };
    this.host.chrome('leaving');
    this.isCovered = false;
    xpRoot.style.pointerEvents = 'none';
    // the glass shows the desktop as it is now (measured before it closes), and the status picture unfolds from the
    // taskbar on the way out: the sit-down minimize played backwards, so nothing on the monitor ever switches at once
    const side = monitors.indexOf(hand.glass);
    const picture = canvasOf(this.host.screenPicture(side));
    if (picture) hand.setSource(picture);
    if (off) hand.fromBlack(0);
    else {
      hand.reSnap();
      hand.paint(1);
    }
    // the screen goes back to what the monitor shows (the camera has not moved yet), then the camera pulls away
    const fade = this.host.reducedMotion ? 0 : DESKTOP_FADE_S * this.host.slow();
    fadeOut(xpRoot, fade, () => {
      const desk = this.desktop();
      if (desk?.isOpen()) desk.close();
      this.tweenCam(
        seat.from,
        this.flightSeconds(FLIGHT_OUT_S),
        () => {
          fadeObjs(restore(), 1);
          this.seat = null;
          this.phase = 'room';
          controls.enabled = true;
          this.host.chrome('room');
          psx.fx = 1;
          // the live status texture, the same picture the last painted frame showed
          delete mdata(hand.glass).hand;
          hand.glass.map = this.host.screenPicture(side);
          hand.dispose(); // a fresh canvas and texture are made at every sit-down
        },
        (k) => {
          if (off) hand.fromBlack(over(OUT.wake, k));
          else hand.paint(1 - k);
          psx.fx = over(OUT.ps1, k);
          if (k > OUT.figure[0]) fadeObjs(restore(), over(OUT.figure, k));
        },
      );
    });
  }
}
