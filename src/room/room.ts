/* The isometric room: one full-screen three.js scene floating in a sky whose colours follow Phuket time, the owner's
   status and the real weather; the Windows XD desktop opens inside either monitor. This module boots the page and
   wires the parts: the scene is built once the model arrives, then one animation loop runs everything. */
import { Box3, Color, OrthographicCamera, Scene, Vector3, WebGLRenderer, sRGBEncoding } from 'three';
import type { Mesh, Object3D } from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { createDesktopRoot, getDesktop } from '../shared/desktop';
import type { RoomDesktop, RoomMountOptions } from '../shared/desktop';
import { SAVER_SCREEN } from '../shared/saver';
import type { Lang, Status } from '../shared/types';
import { debugWanted } from '../shared/debug';
import { CAMERA_DISTANCE } from './camera';
import type { DebugHost } from './debug-panel';
import type { RoomDebugHandle } from './debug-handle';
import { loadDesktop } from './desktop-loader';
import { makeFrames } from './frames';
import type { Frame } from './frames';
import { HandOff } from './handoff';
import { t } from './i18n';
import { LightRig } from './light-rig';
import { BACKDROP, roomLight, screenTint, skyColours, skyFactors } from './lighting';
import { LiveScreens } from './live-screens';
import { loadRoom } from './loader';
import { MaterialIndex, convertMaterials } from './materials';
import { Music } from './music';
import { Monitors } from './monitors';
import type { Side } from './monitors';
import { lightCoast, makeOutdoor } from './outdoor';
import type { Outdoor } from './outdoor';
import { Panels, currentHash, parseRoute } from './panels';
import { GAME_NAMES, pollPresence } from './presence';
import { makePost, psx, render, setBackdrop } from './psx';
import { Figure } from './figure';
import { REDUCED_MOTION, hourOfDay, live, readClock, saveLang, status } from './state';
import { Tags, fitPixelBox, placePixelBox } from './tags';
import { Tour } from './tour';
import type { TourSights } from './tour';
import { byId, must } from './util';
import { WallClock } from './wall-clock';
import { Walls } from './walls';
import { WeatherFx } from './weather-fx';
import { fetchWeather, overcast, restoreWeather } from './weather';

/** PS1 pixels per metre of the room at zoom 1 (CRASH.md: 96, the cleaner hi-res look). */
const PSX_PX_PER_M = 96;
const TARGET = new Vector3(0, 0.95, 0);

/** Everything that exists once the model is in. */
interface Built {
  renderer: WebGLRenderer;
  scene: Scene;
  camera: OrthographicCamera;
  controls: OrbitControls;
  root: Object3D;
  index: MaterialIndex;
  screens: LiveScreens;
  monitors: Monitors;
  lights: LightRig;
  outdoor: Outdoor;
  frames: Frame[];
  walls: Walls;
  weather: WeatherFx;
  tags: Tags;
  figure: Figure;
  clock: WallClock | null;
  anchor: Object3D;
  duvetMade: Object3D | undefined;
  duvetSleep: Object3D | undefined;
  handoff: HandOff;
}

const stage = byId('stage');
const pin = byId('pin');
const note = byId('note');
const panels = new Panels();
const music = new Music(byId('music') as HTMLButtonElement);
let room: Built | null = null;
/** the debug panel's slow-motion factor for the fly-in */
let slow = 1;
/** the debug panel's hour, which a status choice keeps */
let manualHour: number | null = null;
const skyTop = new Color();
const skyLow = new Color();

let renderer: WebGLRenderer | null = null;
try {
  renderer = new WebGLRenderer({ antialias: false, alpha: true, stencil: true });
} catch {
  renderer = null; // no WebGL: the page keeps its chrome and a plain projects button
}

const stageSize = (): [number, number] => [
  stage.clientWidth || window.innerWidth,
  stage.clientHeight || window.innerHeight,
];

/* ---------- the hour, the status, the language ---------- */

function renderTime(): void {
  panels.renderTime(live.lang, live.time.h, live.time.m, status(), live.game.name);
}

/** Lights the page and the room for the hour, the status and the weather. */
function applyTime(): void {
  const hour = hourOfDay();
  const st = status();
  const sky = skyFactors(hour, st === 'sleep');
  const oc = overcast(live.wx); // weather: a flat grey sky, the dusk colours washed out
  skyColours(sky, oc, skyTop, skyLow);
  // the page behind the room follows the state, not the clock: one gradient per state, shared by the CSS and the post
  const [top, bottom] = BACKDROP[st];
  document.documentElement.style.setProperty('--sky-top', top);
  document.documentElement.style.setProperty('--sky-bottom', bottom);
  setBackdrop(top, bottom);
  renderTime();
  const r = room;
  if (!r) return;
  const asleep = st === 'sleep'; // asleep: lamps, neon and LED strips are off
  const L = roomLight(st, hour, sky.day);
  const tint = screenTint(st, live.game.kind);
  r.lights.apply(L, st, hour, oc, tint, skyLow, r.index);
  r.walls.setCards(!asleep);
  r.weather.winBase = L.win;
  if (r.lights.winFill) r.weather.winCol.copy(r.lights.winFill.color);
  r.monitors.tint(tint, asleep ? 0.16 : 0.2); // additive glow cards around the screens: low, local, never a haze
  if (r.duvetMade) r.duvetMade.visible = !asleep;
  if (r.duvetSleep) r.duvetSleep.visible = asleep;
  // gaming: the game on the left screen, a video on the right; nobody at the desk: both run the screen saver
  r.monitors.show((i) => r.screens.forMonitor(i, st, live.game.kind));
  lightCoast(r.outdoor, sky, oc, skyTop, skyLow);
  r.weather.invalidate(); // re-apply the flash level over the new colours next frame
  r.figure.show(st);
  r.clock?.tick(live.time, Date.now());
  r.tags.refresh(live.lang);
}

/** the Projects button's size, measured when its text or font changes (it is placed on whole pixels every frame) */
let pinSize = { w: 0, h: 0 };
function measurePin(): void {
  if (!pin.hidden) pinSize = fitPixelBox(pin);
}

function applyLang(): void {
  panels.applyLang(live.lang);
  measurePin();
  renderTime();
  if (room) {
    for (const f of room.frames) f.draw(live.lang);
    room.tags.refresh(live.lang);
  }
  tour.relang();
}

function setLang(next: Lang): void {
  saveLang(next);
  applyLang();
  room?.handoff.setLang(next);
}

/** Previews (or stops previewing) a status and hour, then re-reads the clock and relights. */
function preview(forced: Status | null, hour: number | null): void {
  live.forced = forced;
  live.preview = hour;
  readClock();
  applyTime();
}

function route(): void {
  const r = parseRoute(currentHash());
  live.preview = r.preview;
  live.forced = r.forced;
  if (r.game) {
    live.game.kind = r.game.kind;
    live.game.name = r.game.name;
  }
  panels.syncPanels();
  readClock();
  applyTime();
}

/** #projects (and the Projects button without a room): the desktop with My Projects open. */
function openProjects(): void {
  const show = (desk: RoomDesktop): void => {
    desk.openApp('projects');
  };
  if (room) {
    if (!room.handoff.atPC) room.handoff.sitDown('L', show);
    else {
      const desk = getDesktop();
      if (desk) show(desk);
    }
  } else if (document.body.classList.contains('no-3d')) openFlatDesktop(show);
  // still loading: the boot sees the hash once the room is built (or fails)
}

const tour = new Tour(
  {
    lang: () => live.lang,
    reducedMotion: REDUCED_MOTION,
    now: () => ({ h: live.time.h, m: live.time.m, status: status(), gameName: live.game.name }),
    current: () => ({ forced: live.forced, hour: live.preview, game: { ...live.game } }),
    preview: (p) => {
      if (p) {
        live.game.kind = p.game.kind;
        live.game.name = p.game.name;
      }
      preview(p?.forced ?? null, p?.hour ?? null);
    },
    camera: {
      get target() {
        return must(room).controls.target;
      },
      get zoom() {
        return must(room).camera.zoom;
      },
      set zoom(z: number) {
        must(room).camera.zoom = z;
      },
      get maxZoom() {
        return must(room).controls.maxZoom;
      },
    },
    updateCamera: () => {
      room?.camera.updateProjectionMatrix();
    },
    canDrift: () => !room?.handoff.atPC,
    hideHint: () => {
      note.style.opacity = '0';
    },
  },
  () => sights(must(room)),
);

/* ---------- the scene ---------- */

function centreOf(root: Object3D, name: string): Vector3 | null {
  const o = root.getObjectByName(name);
  return o ? new Box3().setFromObject(o).getCenter(new Vector3()) : null;
}

function sights(r: Built): TourSights {
  const clock = centreOf(r.root, 'Clock_case');
  const window = centreOf(r.root, 'Window_Glass');
  const frame = (k: Frame['kind']): Vector3 | null => r.frames.find((f) => f.kind === k)?.centre.clone() ?? null;
  return {
    desk: centreOf(r.root, 'Anchor_projects'),
    hammock: centreOf(r.root, 'Hammock_swing') ?? window,
    bed: centreOf(r.root, 'Bed_duvet_sleep') ?? centreOf(r.root, 'Bed_duvet_made'),
    resume: frame('resume'),
    diploma: frame('diploma'),
    place: clock && window ? clock.lerp(window, 0.5) : null,
  };
}

function layout(): void {
  const r = room;
  if (!r) return;
  const [w, h] = stageSize();
  if (!r.handoff.atPC) r.monitors.fit(w, h, r.camera);
  r.screens.resize(w, h);
  const aspect = w / h;
  r.renderer.setSize(w, h, false);
  const vh = Math.max(8.6, 9.6 / aspect);
  psx.base = (h * r.renderer.getPixelRatio()) / (vh * PSX_PX_PER_M); // device pixels per PS1 pixel at zoom 1
  psx.S0 = Math.max(2, Math.min(8, Math.round(psx.base)));
  const cam = r.camera;
  cam.left = (-vh * aspect) / 2;
  cam.right = (vh * aspect) / 2;
  cam.top = vh / 2;
  cam.bottom = -vh / 2;
  cam.updateProjectionMatrix();
}

function mountOptions(): RoomMountOptions {
  return {
    lang: live.lang,
    phuketTime: () => ({ h: live.time.h, m: live.time.m }),
    status,
    onExit: (how) => {
      room?.handoff.standUp(how);
    },
    onOpenResume: () => {
      panels.openResume();
    },
    // exactly the position the monitor shows this frame
    saverPos: () => must(room).screens.saverPosNow(),
    saverBase: SAVER_SCREEN.w,
    // the desktop's language switch moves the whole page too
    onLangChange: (l: Lang) => {
      if (l !== live.lang) setLang(l);
    },
    // the tray's volume slider turns the room's music down too (mute is the shared switch: src/shared/sound.ts)
    onVolumeChange: (volume: number) => {
      music.follow(volume);
    },
  };
}

function build(gl: WebGLRenderer, gltf: GLTF): Built {
  gl.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  gl.outputEncoding = sRGBEncoding;
  gl.setClearColor(0x000000, 0); // no shadow maps: shadows are painted into vertex colours (PS1.md §8)
  stage.appendChild(gl.domElement);
  makePost();
  const scene = new Scene();
  const root = gltf.scene;
  scene.add(root);
  const camera = new OrthographicCamera(-1, 1, 1, -1, 0.1, 600);
  // extra start angles, handy for checking the portal
  const h0 = currentHash();
  const from =
    h0 === 'southwest' ? [-1, 0.8, 1] : h0 === 'northeast' ? [1, 0.6, -1] : h0 === 'low' ? [1, 0.35, 1] : [1, 0.8, 1];
  camera.position.copy(TARGET).addScaledVector(new Vector3(from[0], from[1], from[2]).normalize(), CAMERA_DISTANCE);
  const controls = new OrbitControls(camera, gl.domElement);
  controls.target.copy(TARGET);
  controls.enablePan = false;
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.rotateSpeed = 0.65;
  controls.minPolarAngle = 0.3;
  controls.maxPolarAngle = 1.38;
  controls.minZoom = 0.6;
  controls.maxZoom = 3;
  controls.update();

  const index = new MaterialIndex();
  convertMaterials(root, index);
  const screens = new LiveScreens(REDUCED_MOTION);
  const monitors = new Monitors(root, [screens.tex.editor, screens.tex.terminal]);
  const lights = new LightRig(scene);
  const duvetMade = root.getObjectByName('Bed_duvet_made');
  const duvetSleep = root.getObjectByName('Bed_duvet_sleep');
  const wallN = must(root.getObjectByName('WallN'), 'WallN');
  const wallW = must(root.getObjectByName('WallW'), 'WallW');
  // the window is a portal: the coast is drawn only where the glass is visible, from any angle
  const outdoor = makeOutdoor(root);
  const frames = makeFrames(root);
  for (const f of frames) f.draw(live.lang);
  const walls = new Walls(wallN, wallW, index);
  const weather = new WeatherFx(
    root,
    scene,
    outdoor,
    live.wx,
    () => lights.winFill,
    () => walls.k(0) > 0.98,
  );
  const tags = new Tags(root, frames, live.wx);
  walls.addCards(root);
  const figure = new Figure(root, index, outdoor.mats);
  figure.addZzz(scene);
  const display = root.getObjectByName('Clock_display') as Mesh | undefined;
  const clock = display ? new WallClock(display) : null;
  const anchor = must(root.getObjectByName('Anchor_projects'), 'Anchor_projects');
  lights.place(root, anchor);

  const handoff = new HandOff(
    {
      camera,
      controls,
      root,
      monitors,
      reducedMotion: REDUCED_MOTION,
      slow: () => slow,
      status,
      game: () => live.game,
      atDesk: () => figure.atDesk(),
      screenPicture: (i) => screens.forMonitor(i, status(), live.game.kind),
      readableCode: () => screens.readableCode(stage.clientWidth, stage.clientHeight),
      mountOptions,
      lang: () => live.lang,
      chrome: (stage) => {
        if (stage === 'pc') {
          pin.style.opacity = '0';
          note.style.opacity = '0';
          document.body.classList.add('at-pc');
        } else if (stage === 'leaving') document.body.classList.remove('at-pc');
        else {
          pin.style.opacity = '1';
          layout(); // the window may have changed while at the PC (a phone turned): fit the monitors again
        }
      },
      relight: applyTime,
      fallback: () => {
        say('noDesktop');
      },
      loadDesktop,
    },
    getDesktop,
  );
  return {
    renderer: gl,
    scene,
    camera,
    controls,
    root,
    index,
    screens,
    monitors,
    lights,
    outdoor,
    frames,
    walls,
    weather,
    tags,
    figure,
    clock,
    anchor,
    duvetMade,
    duvetSleep,
    handoff,
  };
}

/* ---------- pointer ---------- */

function pointer(r: Built): void {
  const el = r.renderer.domElement;
  let downAt: [number, number] | null = null;
  /** the framed picture under the pointer, unless a monitor is in front or its wall is see-through */
  const frameAt = (ev: PointerEvent): Frame | null => {
    if (!r.frames.length || r.walls.k(1) < 0.6) return null;
    const ray = r.monitors.aim(ev, el, r.camera);
    const hit = ray.intersectObjects(
      r.frames.map((f) => f.mesh),
      false,
    )[0];
    if (!hit) return null;
    const mh = r.monitors.hit(ray);
    if (mh && mh.distance < hit.distance) return null;
    return r.frames.find((f) => f.mesh === hit.object) ?? null;
  };
  const monitorAt = (ev: PointerEvent): Side | null => r.monitors.hit(r.monitors.aim(ev, el, r.camera))?.side ?? null;
  el.addEventListener('pointermove', (ev) => {
    const free = !r.handoff.atPC && !downAt;
    hovering = free && !!monitorAt(ev);
    el.style.cursor = hovering || (free && frameAt(ev)) ? 'pointer' : 'grab';
  });
  el.addEventListener('pointerdown', (ev) => {
    downAt = [ev.clientX, ev.clientY];
  });
  el.addEventListener('pointerup', (ev) => {
    const moved = downAt ? Math.abs(ev.clientX - downAt[0]) + Math.abs(ev.clientY - downAt[1]) : 99;
    downAt = null;
    if (moved > 6) {
      return; // it was a drag
    }
    const which = monitorAt(ev);
    if (which) {
      r.handoff.sitDown(which);
      return;
    }
    const fr = frameAt(ev);
    if (fr?.kind === 'resume') {
      panels.openResume();
      return;
    }
    if (fr) {
      const p = fr.top.clone();
      p.y += 0.1;
      r.tags.showInfo(p, t(live.lang).diploma);
    }
  });
  el.addEventListener('pointerleave', () => {
    hovering = false;
    downAt = null;
  });
  window.addEventListener('resize', layout);
}

/* ---------- the loop ---------- */

let hovering = false;
let last = performance.now();
let clockAcc = 0;
const pinAt = new Vector3();

function tagView(r: Built): Parameters<Tags['place']>[0] {
  return {
    camera: r.camera,
    width: stage.clientWidth,
    height: stage.clientHeight,
    room: !r.handoff.atPC,
    isOn: (k) => tour.isOn(k),
    wallK: (w) => r.walls.k(w),
    pin: null,
  };
}
const pinBox = { x: 0, y: 0, w: 0, h: 0, covered: false };
let view: ReturnType<typeof tagView> | null = null;

function frame(now: number): void {
  const dt = Math.min((now - last) / 1000, 0.05);
  last = now;
  clockAcc += dt;
  if (clockAcc > 5) {
    clockAcc = 0;
    if (readClock()) applyTime();
  }
  const r = room;
  if (r) {
    const atPC = r.handoff.atPC;
    if (!atPC) r.controls.update();
    // dollhouse: a wall and everything on it fades while the camera is behind it
    r.walls.tick(dt, r.camera, r.controls.target);
    // the coast switches exactly when the window is edge-on to the camera, the one moment the switch cannot be seen
    r.outdoor.mask.visible = r.outdoor.group.visible = r.walls.lookingIn;
    r.monitors.hover(hovering && !atPC, dt);
    const st = status();
    if (!REDUCED_MOTION) r.figure.idle(now / 1000, st);
    r.clock?.tick(live.time, Date.now());
    // one clock for everything that must agree with the desktop (frame timestamps drift from it in some browsers)
    const pt = performance.now() / 1000;
    r.screens.tick(pt, st, atPC);
    r.outdoor.animate(pt);
    r.weather.tick(pt, dt);
    // nothing to draw while the desktop or the (opaque) resume sheet covers the whole window
    if (!r.handoff.covered && !panels.sheetOpen) {
      render(r.renderer, r.scene, r.camera);
      r.anchor.getWorldPosition(pinAt).project(r.camera);
      // the pixel tail's tip on the desk
      pinBox.x = ((pinAt.x + 1) / 2) * stage.clientWidth;
      pinBox.y = ((1 - pinAt.y) / 2) * stage.clientHeight - 12;
      pinBox.w = pinSize.w;
      pinBox.h = pinSize.h;
      placePixelBox(pin, pinBox.x, pinBox.y, pinSize);
      const pinOn = tour.isOn('projects') && !pin.hidden;
      pin.style.visibility = pinOn ? 'visible' : 'hidden';
      view ??= tagView(r);
      view.width = stage.clientWidth;
      view.height = stage.clientHeight;
      view.room = !atPC;
      view.pin = pinOn && !atPC ? pinBox : null; // labels give way to the Projects button
      r.tags.place(view);
      tour.drift(dt);
    }
  }
  requestAnimationFrame(frame);
}

/* ---------- boot ---------- */

/** A line at the bottom of the page (no 3D, no desktop), which stays. */
function say(key: 'no3d' | 'noDesktop'): void {
  note.firstElementChild?.setAttribute('data-room-t', key);
  panels.applyLang(live.lang);
  note.style.opacity = '1';
}

/** No room (no WebGL, or the model failed): the desktop opens straight away, full-screen, without the 3D around it;
 *  leaving it shows the Projects button, which opens it again. */
function fail(): void {
  byId('loading').style.opacity = '0';
  document.body.classList.add('no-3d');
  say('no3d');
  pin.hidden = false;
  measurePin();
  placePixelBox(pin, window.innerWidth / 2, window.innerHeight / 2, pinSize);
  pin.hidden = true; // the desktop opens at once; leaving it shows the button
  pin.style.visibility = 'visible';
  pin.style.opacity = '1';
  openFlatDesktop(currentHash() === 'projects' ? (d) => d.openApp('projects') : undefined);
  music.prefetch();
}

let flatRoot: HTMLElement | null = null;

/** The desktop as a plain full-screen page (no room to sit down in). */
function openFlatDesktop(then?: (desk: RoomDesktop) => void): void {
  void loadDesktop().then((ok) => {
    const desk = getDesktop();
    if (!ok || !desk) {
      pin.hidden = false;
      say('noDesktop');
      return;
    }
    if (!flatRoot) {
      flatRoot = createDesktopRoot();
      flatRoot.style.cssText = 'position:fixed;inset:0;z-index:40;overflow:hidden';
      desk.mount(flatRoot, {
        lang: live.lang,
        phuketTime: () => ({ h: live.time.h, m: live.time.m }),
        status,
        onExit: () => {
          desk.close();
          if (flatRoot) flatRoot.style.display = 'none';
          document.body.classList.remove('at-pc');
          pin.hidden = false;
          note.style.opacity = '1';
        },
        onOpenResume: () => {
          panels.openResume();
        },
        onLangChange: (l: Lang) => {
          if (l !== live.lang) setLang(l);
        },
        onVolumeChange: (volume: number) => {
          music.follow(volume);
        },
      });
    }
    flatRoot.style.display = '';
    pin.hidden = true;
    note.style.opacity = '0';
    document.body.classList.add('at-pc'); // the top bar steps aside, the resume sheet opens above the desktop
    desk.setLang(live.lang);
    desk.open({ noBoot: true, instant: true });
    then?.(desk);
  });
}

function debugHost(): DebugHost {
  return {
    slow,
    ps1: psx.on,
    setSlow: (k) => {
      slow = k;
    },
    setPs1: (on) => {
      psx.on = on;
    },
    setWeather: (kind) => {
      live.wx.forced = kind;
      applyTime();
    },
    setState: (state, game) => {
      live.forced = state;
      if (game) {
        live.game.kind = game;
        live.game.name = GAME_NAMES[game];
      }
      const now = live.presence;
      if (!state && now?.playing) {
        live.game.kind = now.kind;
        live.game.name = now.game;
      }
      // the state and the hour are independent: the light follows the hour (asleep is night anyway)
      preview(state, manualHour);
    },
    setHour: (hour) => {
      manualHour = hour;
      preview(live.forced, hour);
    },
  };
}

function debugHandle(gl: WebGLRenderer, r: Built): RoomDebugHandle {
  return {
    psx,
    scene: r.scene,
    renderer: gl,
    camera: r.camera,
    controls: r.controls,
    sitDown: (which) => {
      r.handoff.sitDown(which);
    },
    standUp: (how) => {
      r.handoff.standUp(how);
    },
    strike: () => {
      r.weather.strike();
    },
  };
}

export function startRoom(): void {
  psx.on = !location.hash.includes('nops1');
  byId('lang-ru').addEventListener('click', () => {
    setLang('ru');
  });
  byId('lang-en').addEventListener('click', () => {
    setLang('en');
  });
  pin.addEventListener('click', () => {
    if (room) room.handoff.sitDown('L');
    else if (document.body.classList.contains('no-3d')) openFlatDesktop();
  });
  window.addEventListener('hashchange', () => {
    route();
    if (currentHash() === 'projects') openProjects(); // a link to #projects followed on the page (the boot handles a load)
  });
  // the debug panel is a chunk of its own: visitors never download it
  if (debugWanted()) void import('./debug-panel').then((m) => m.makeDebugPanel(debugHost()));

  // the weather goes first, in parallel with the room; the last answer is remembered for a repeat visit
  restoreWeather(live.wx, Date.now());
  void fetchWeather(live.wx, applyTime);
  setInterval(() => {
    if (!document.hidden) void fetchWeather(live.wx, applyTime); // a hidden tab catches up when it is shown again
  }, 15 * 60e3);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && Date.now() - live.wx.at > 15 * 60e3) void fetchWeather(live.wx, applyTime);
  });
  applyLang();
  readClock();
  applyTime();
  const gl = renderer;
  if (gl) {
    loadRoom((k) => {
      byId('meter').style.width = String(k * 100) + '%';
    })
      .then((gltf) => {
        byId('meter').style.width = '100%';
        const r = build(gl, gltf);
        room = r;
        if (debugWanted()) window.__psx = debugHandle(gl, r);
        layout();
        applyTime();
        byId('loading').style.opacity = '0';
        pin.hidden = false;
        measurePin();
        void document.fonts.ready.then(measurePin);
        setTimeout(
          () => {
            if (!r.handoff.atPC) tour.start(false);
          },
          REDUCED_MOTION ? 0 : 900,
        );
        // the desktop module, then its shell (invisible), when the page is idle: a click on a monitor then starts the
        // flight at once
        const later = (f: () => void): void => {
          if ('requestIdleCallback' in window) window.requestIdleCallback(f, { timeout: 3000 });
          else setTimeout(f, 1200);
        };
        later(() => {
          music.prefetch();
          void loadDesktop().then((ok) => {
            if (ok)
              later(() => {
                if (!r.handoff.atPC) r.handoff.ensureDesktop();
              });
          });
        });
        // #pc opens straight at the computer, #pcdota with a game running, #projects with My Projects open
        const h = currentHash();
        if (h.startsWith('pc') || h === 'projects')
          setTimeout(() => {
            if (h === 'projects') openProjects();
            else r.handoff.sitDown('L');
          }, 700);
        pointer(r);
      })
      .catch((e: unknown) => {
        console.error(e);
        fail();
      });
  } else fail();
  route();
  pollPresence((p) => {
    const was = live.presence?.playing ? live.presence.game : null;
    live.presence = p;
    if (p?.playing && !live.forced) {
      live.game.kind = p.kind;
      live.game.name = p.game;
    }
    // re-light only when the game changes; a failed reading mid-game counts (the room must not stay in the game)
    if (was !== (p?.playing ? p.game : null)) applyTime();
  });
  requestAnimationFrame(frame);
}
