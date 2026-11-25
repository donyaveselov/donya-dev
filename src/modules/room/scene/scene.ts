/* The 3D room: everything made from the loaded model (the camera, the PS1 materials, the screens, the lights, the
   coast in the window, the see-through walls, the weather, the labels, the owner), how it is lit for the hour, the
   status and the weather, and what moves in it every frame. */
import { Box3, Color, Scene, Vector3, sRGBEncoding } from 'three';
import type { Mesh, Object3D, OrthographicCamera, WebGLRenderer } from 'three';
import type { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { fitCamera, makeCamera, makeControls } from './camera';
import { Figure } from './figure';
import { makeFrames } from './frames';
import type { Frame } from './frames';
import { LightRig } from './light-rig';
import { roomLight, screenTint, skyColours, skyFactors } from './lighting';
import { LiveScreens } from '../screens/live-screens';
import { MaterialIndex, convertMaterials } from './materials';
import { Monitors } from './monitors';
import { lightCoast, makeOutdoor } from './outdoor';
import type { Outdoor } from './outdoor';
import { makePost, psx } from './psx';
import { REDUCED_MOTION, hourOfDay, live, status } from '../store/state';
import { Tags } from '../components/tags';
import type { TourSights } from '../tour/tour';
import { must } from '../../../utils/dom';
import { WallClock } from './wall-clock';
import { Walls } from './walls';
import { WeatherFx } from './weather-fx';
import { overcast } from '../../../services/weather.service';

/** PS1 pixels per metre of the room at zoom 1. */
const PSX_PX_PER_M = 96;

export interface RoomScene {
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
  /** the point on the desk the Projects button points at */
  anchor: Object3D;
  duvetMade: Object3D | undefined;
  duvetSleep: Object3D | undefined;
}

/**
 * Builds the room from the loaded model. The order matters beyond the obvious dependencies: three draws every uuid
 * from Math.random, which the regression harness seeds, so moving a constructor moves the rain (see weather-fx.ts).
 */
const SHOE_UPPER = 0x8b8473; // the tee's off-white
const SHOE_SOLE = 0x15131c;

export function buildScene(gl: WebGLRenderer, gltf: GLTF, stage: HTMLElement): RoomScene {
  gl.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  gl.outputEncoding = sRGBEncoding;
  gl.setClearColor(0x000000, 0); // transparent: the page's gradient shows behind the room
  stage.appendChild(gl.domElement);
  makePost();
  const scene = new Scene();
  const root = gltf.scene;
  scene.add(root);
  const camera = makeCamera();
  const controls = makeControls(camera, gl.domElement);

  const index = new MaterialIndex();
  convertMaterials(root, index);
  // the figure's sneakers were the chair's red: in front of the seat they read as a cushion that had fallen off, so
  // they are light canvas shoes on dark soles (the figure's materials are unlit: these are the drawn colours)
  for (const m of index.get('shoe')) m.color.setHex(SHOE_UPPER);
  for (const m of index.get('shoe_sole')) m.color.setHex(SHOE_SOLE);
  const screens = new LiveScreens(REDUCED_MOTION, () => live.lang);
  const monitors = new Monitors(root, [screens.tex.editor, screens.tex.terminal]);
  const lights = new LightRig(scene); // no shadow maps: the model's shadows are painted into its vertex colours
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
  const figure = new Figure(root);
  figure.addZzz(scene);
  const display = root.getObjectByName('Clock_display') as Mesh | undefined;
  const clock = display ? new WallClock(display) : null;
  const anchor = must(root.getObjectByName('Anchor_projects'), 'Anchor_projects');
  lights.place(root, anchor);
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
  };
}

/** Fits the renderer, the camera, the monitors' panels and the PS1 pixel size to the stage. */
export function fitScene(r: RoomScene, w: number, h: number, atPC: boolean): void {
  if (!atPC) r.monitors.fit(w, h, r.camera); // not at the PC: the camera is parked on the glass as it is
  r.screens.resize(w, h);
  r.renderer.setSize(w, h, false);
  const metres = fitCamera(r.camera, w / h);
  psx.base = (h * r.renderer.getPixelRatio()) / (metres * PSX_PX_PER_M);
}

const skyTop = new Color();
const skyLow = new Color();

/** Lights the room for what `live` shows: the hour, the status, the game on the screens, the weather. */
export function lightScene(r: RoomScene): void {
  const hour = hourOfDay();
  const st = status();
  const asleep = st === 'sleep'; // asleep: lamps, neon and LED strips are off
  const sky = skyFactors(hour, asleep);
  const oc = overcast(live.wx); // weather: a flat grey sky, the dusk colours washed out
  skyColours(sky, oc, skyTop, skyLow);
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

export interface FrameState {
  /** the frame's timestamp, ms */
  now: number;
  /** seconds since the last frame */
  dt: number;
  /** the camera and the monitors belong to the hand-off */
  atPC: boolean;
  /** the pointer is over a monitor */
  hovering: boolean;
  /** somebody sees the monitors' live pictures: redraw them */
  screensSeen: boolean;
}

/** One frame of everything that moves in the room. */
export function animateScene(r: RoomScene, f: FrameState): void {
  if (!f.atPC) r.controls.update();
  // dollhouse: a wall and everything on it fades while the camera is behind it
  r.walls.tick(f.dt, r.camera, r.controls.target);
  // the coast switches exactly when the window is edge-on to the camera, the one moment the switch cannot be seen
  r.outdoor.mask.visible = r.outdoor.group.visible = r.walls.lookingIn;
  r.monitors.hover(f.hovering && !f.atPC, f.dt);
  const st = status();
  if (!REDUCED_MOTION) r.figure.idle(f.now / 1000, st);
  r.clock?.tick(live.time, Date.now());
  // one clock for everything that must agree with the desktop (frame timestamps drift from it in some browsers)
  const t = performance.now() / 1000;
  if (f.screensSeen) r.screens.tick(t, st, f.atPC);
  r.outdoor.animate(t);
  r.weather.tick(t, f.dt);
}

function centreOf(root: Object3D, name: string): Vector3 | null {
  const o = root.getObjectByName(name);
  return o ? new Box3().setFromObject(o).getCenter(new Vector3()) : null;
}

/** Where the tour's camera leans, by what it talks about. */
export function tourSights(r: RoomScene): TourSights {
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
