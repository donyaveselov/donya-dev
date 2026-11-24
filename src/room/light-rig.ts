// The room's lights and the materials lit by name (LEDs, lamp shades, wood, keyboard), set for the hour and status.
import {
  Color,
  DirectionalLight,
  HemisphereLight,
  MeshBasicMaterial,
  MeshLambertMaterial,
  PointLight,
  SpotLight,
  Vector3,
} from 'three';
import type { Object3D, Scene } from 'three';
import type { Status } from '../shared/types';
import type { LightPreset } from './lighting';
import { lampsOff, linear } from './lighting';
import type { MaterialIndex } from './materials';
import { mdata } from './psx';
import type { RoomMaterial } from './psx';

const OVERCAST_SKY = linear(0xc8d4e8);
const WOOD_BLUE = linear(0x1a34b0);
const SHADE_GLOW = linear(0xffb964);
const WOOD = ['floor', 'desk_top', 'wood_light', 'bed_wood', 'bed_wood_dark'];
const LEDS = ['led_cyan', 'led_magenta', 'led_green'];

/** Sets a material's colour to its original times k (the original is kept on first use). */
function level(m: RoomMaterial, k: number): void {
  const d = mdata(m);
  d.c0 ??= m.color.clone();
  m.color.copy(d.c0).multiplyScalar(k);
}

/** An LED's level: a lit one takes it on the emission too; a dim LED is dark plastic, no swatch catching the light. */
function ledLevel(m: RoomMaterial, v: number): void {
  level(m, v);
  if (!(m instanceof MeshBasicMaterial)) m.emissiveIntensity = v;
}

export class LightRig {
  /** the screens' light: no shadow map; a cone aimed forward and down keeps most of it off the floor under the desk */
  readonly screen = new SpotLight(0xa9d2ff, 1, 5, 0.95, 1, 1);
  hemi: HemisphereLight | null = null;
  key: DirectionalLight | null = null;
  /** the window fill: just inside the glass, the colour of the sky low down */
  winFill: PointLight | null = null;
  private readonly lamps: PointLight[] = [];
  private readonly glow: { light: PointLight; max: number }[] = [];
  private readonly linCol = new Color();

  constructor(private readonly scene: Scene) {
    scene.add(this.screen);
    scene.add(this.screen.target);
  }

  /** The rest of the lights, placed by the model's objects. */
  place(root: Object3D, anchor: Object3D): void {
    const scene = this.scene;
    this.hemi = new HemisphereLight(0x8a86c8, 0x2a2238, 0.42);
    scene.add(this.hemi);
    this.key = new DirectionalLight(0xaab4ff, 0.12); // no shadow map
    this.key.position.set(5, 9, 6);
    scene.add(this.key);
    const at = (name: string, dy = 0): Vector3 => {
      const v = new Vector3();
      root.getObjectByName(name)?.getWorldPosition(v);
      v.y += dy;
      return v;
    };
    // Linear falloff (decay 1) over short distances: over coarse vertices it gives the clean PS1 lamp pool. The lamps
    // sit almost in the wall plane, where per-vertex N.L is ~0: pulled into the room so the wall gets a pool, and a
    // shorter reach so the pool has an edge on the 0.5 m grid.
    const point = (p: Vector3, color: number, distance: number): PointLight => {
      const l = new PointLight(color, 0, distance, 1);
      l.position.copy(p);
      scene.add(l);
      return l;
    };
    this.lamps.push(point(at('Lamp_bar').add(new Vector3(-0.3, 0.2, 0.5)), 0xffb964, 3.5));
    this.lamps.push(point(at('Bedside_lamp', 0.55).add(new Vector3(0.45, 0.1, 0.3)), 0xffb964, 3.5));
    this.glow.push({ light: point(at('Desk_led', -0.2), 0xff3fa8, 2.5), max: 0.5 });
    this.glow.push({ light: point(at('PC_case').add(new Vector3(0.3, 0, 0)), 0x29e0ff, 2.5), max: 0.6 });
    // aim the screen light from between the monitors towards the chair and the floor in front of the desk
    const sp = new Vector3();
    anchor.getWorldPosition(sp);
    sp.y -= 0.32;
    sp.z += 0.08;
    this.screen.position.copy(sp);
    this.screen.target.position.set(sp.x - 0.1, 0.2, sp.z + 2.2);
    this.screen.target.updateMatrixWorld();
    this.winFill = new PointLight(0x000000, 0, 7, 1);
    this.winFill.position.copy(at('Window_Glass', -0.2)).add(new Vector3(0, 0.4, 1.4));
    scene.add(this.winFill);
  }

  /**
   * Lights the room: the preset's lights, a cooler and dimmer daylight when overcast, and asleep the lamps, neon and
   * LED strips off. `windowSky` is the sky's low colour (sRGB) the window fill takes while the lamps are on.
   */
  apply(
    L: LightPreset,
    status: Status,
    hour: number,
    overcast: number,
    tint: number,
    windowSky: Color,
    index: MaterialIndex,
  ): void {
    const hemi = this.hemi;
    const key = this.key;
    const win = this.winFill;
    if (!hemi || !key || !win) return;
    hemi.color.setHex(L.sky);
    hemi.groundColor.setHex(L.gnd);
    hemi.intensity = L.hemi;
    key.color.setHex(L.keyCol);
    key.intensity = L.key;
    const asleep = status === 'sleep';
    if (!asleep) {
      const dimK = overcast * lampsOff(hour);
      hemi.intensity *= 1 - 0.15 * dimK;
      hemi.color.lerp(OVERCAST_SKY, 0.35 * dimK);
    }
    const lampCol = this.linCol.setHex(L.lampCol).convertSRGBToLinear();
    this.lamps.forEach((l, i) => {
      l.intensity = L.lamps[i] ?? 0;
      l.color.copy(lampCol);
      l.distance = L.lampDist;
    });
    for (const g of this.glow) g.light.intensity = g.max * L.glow;
    // orange wood has no blue to reflect: asleep the wood carries a faint blue self-light so the floor reads blue
    for (const n of WOOD)
      for (const m of index.get(n))
        if (m instanceof MeshLambertMaterial) {
          m.emissive.copy(WOOD_BLUE);
          m.emissiveIntensity = asleep ? 0.3 : 0;
        }
    // lit, the shade's look is its own glow: its diffuse is dimmed so the lamp next to it cannot clip it to a sticker
    for (const m of index.get('lamp_glow')) {
      level(m, asleep ? 1 : 0.04);
      if (m instanceof MeshLambertMaterial) {
        m.emissive.copy(SHADE_GLOW);
        m.emissiveIntensity = asleep ? 0.06 : 0.8;
      }
    }
    for (const n of LEDS) for (const m of index.get(n)) ledLevel(m, asleep ? 0.06 : 1);
    for (const m of index.get('led_kbd')) ledLevel(m, asleep ? 0.35 : 1);
    // asleep, the screen light falls straight onto the keyboard: its cyan legends would be the brightest thing on the
    // desk, and the underglow must not outshine the screens at night
    for (const m of index.get('keyboard')) level(m, asleep ? 0.4 : 1);
    // the screens throw light into the room, tinted by what is on them
    this.screen.color.setHex(tint).convertSRGBToLinear();
    this.screen.intensity = L.scr;
    this.screen.distance = 5;
    // the window: the sky's low colour while the lamps are on, moonlight asleep
    if (L.winCol !== null) win.color.setHex(L.winCol).convertSRGBToLinear();
    else win.color.copy(windowSky).convertSRGBToLinear();
    win.intensity = L.win;
    win.distance = 7;
  }
}
