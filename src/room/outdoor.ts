/* The coast behind the window: a portal (drawn only where the glass is visible, from any angle), the sea, the sky dome.

   Water is a pattern that just floats, as in PS1 games: the sea and the shallows carry one 64 px caustic tile in two
   layers, the mesh itself scrolling one way, an additive copy just above it (mirrored, larger) scrolling another.
   Offsets move in whole texels, never sub-texel sliding; where the two nets cross, bright knots travel. A slow vertex
   bob makes the snapped surface swim a little. */
import {
  AdditiveBlending,
  AlwaysStencilFunc,
  BackSide,
  BufferAttribute,
  Color,
  DoubleSide,
  EqualStencilFunc,
  KeepStencilOp,
  Mesh,
  MeshBasicMaterial,
  NormalBlending,
  ReplaceStencilOp,
  SphereGeometry,
  Vector3,
} from 'three';
import type { BufferGeometry, Material, Object3D, Shader, Texture } from 'three';
import { linear } from './lighting';
import type { SkyFactors } from './lighting';
import { isMesh, materialOf } from './materials';
import { cloneM, mdata, ps1, psx } from './psx';
import type { RoomMaterial } from './psx';
import { seaTile } from './textures';
import { must } from './util';

/** Makes a material draw only where the window mask wrote the stencil. */
export function portal<M extends Material>(m: M): M {
  m.stencilWrite = true;
  m.stencilFunc = EqualStencilFunc;
  m.stencilRef = 1;
  m.stencilFail = m.stencilZFail = m.stencilZPass = KeepStencilOp;
  return m;
}

function seaBob(sh: Shader): void {
  sh.vertexShader = sh.vertexShader.replace(
    '#include <begin_vertex>',
    '#include <begin_vertex>\n' +
      '{ vec4 wp = modelMatrix * vec4(transformed, 1.0); transformed.y += 0.02 * sin(wp.x * 0.5 + uTime * 1.1) + 0.015 * sin(wp.z * 0.45 - uTime * 0.8); }',
  );
}

interface SeaLayer {
  map: Texture;
  /** texels per second */
  vx: number;
  vy: number;
}
interface Wave {
  mesh: Mesh;
  p0: Vector3;
  phase: number;
}

export interface Outdoor {
  group: Object3D;
  /** every coast material, tinted by the hour (applyTime) and brightened by lightning */
  mats: RoomMaterial[];
  sun: Mesh | null;
  sunMat: MeshBasicMaterial;
  dome: Mesh<BufferGeometry, MeshBasicMaterial>;
  mask: Mesh;
  animate(t: number): void;
}

const SEA_PAL = [0x0e86c8, 0x19a8d8, 0x5fd8e8, 0xffffff] as const;
const SHORE_PAL = [0x22c8c0, 0x4fe0d0, 0xa8f5e4, 0xffffff] as const;

export function makeOutdoor(root: Object3D): Outdoor {
  const group = must(root.getObjectByName('Outdoor'), 'Outdoor');
  const tiles: Record<string, Texture> = { Out_sea: seaTile(SEA_PAL, 7), Out_shallow: seaTile(SHORE_PAL, 7) };
  const mats: RoomMaterial[] = [];
  const layers: SeaLayer[] = [];
  const waves: Wave[] = [];
  const layerB: [Object3D, Mesh][] = [];
  let sun: Mesh | null = null;
  let sunMat: MeshBasicMaterial | null = null;
  const v = new Vector3();

  group.traverse((o) => {
    if (!isMesh(o)) return;
    o.renderOrder = 3;
    if (o.name === 'Sun') {
      sun = o;
      sunMat = portal(ps1(new MeshBasicMaterial({ color: linear(0xfff3c4) })));
      o.material = sunMat;
      return;
    }
    const m = portal(cloneM(materialOf(o)));
    o.material = m;
    const d = mdata(m);
    d.base0 = m.color.clone();
    mats.push(m);
    if (o.name.startsWith('Cloud')) d.cloud = true;
    const tile = tiles[o.name];
    if (tile) {
      // layer A: the mesh itself, a 2 m tile in world xz; layer B: an additive copy just above, mirrored and 4/3 larger
      const p = o.geometry.attributes.position as BufferAttribute;
      const uv = new Float32Array(p.count * 2);
      for (let j = 0; j < p.count; j++) {
        v.fromBufferAttribute(p, j).applyMatrix4(o.matrixWorld);
        uv[j * 2] = v.x / 2;
        uv[j * 2 + 1] = v.z / 2;
      }
      o.geometry.setAttribute('uv', new BufferAttribute(uv, 2));
      m.map = tile;
      d.base0.setRGB(1, 1, 1);
      d.psxExtra = seaBob;
      d.psxKey = 'sea';
      ps1(m);
      layers.push({ map: tile, vx: 5, vy: 3 });
      const tb = tile.clone();
      tb.needsUpdate = true;
      tb.repeat.set(-0.75, 0.75);
      const mb = portal(cloneM(m));
      mb.map = tb;
      mb.transparent = true;
      mb.opacity = 0.25;
      mb.blending = AdditiveBlending;
      mb.depthWrite = false;
      mdata(mb).base0 = new Color(1, 1, 1);
      mats.push(mb);
      layers.push({ map: tb, vx: -3, vy: 4 });
      const b = new Mesh(o.geometry, mb); // added after the walk, so the walk never meets it
      b.position.copy(o.position);
      b.quaternion.copy(o.quaternion);
      b.scale.copy(o.scale);
      b.position.y += 0.005;
      b.renderOrder = 4;
      layerB.push([must(o.parent), b]);
    }
    if (/^Out_wave_|^Out_foam$/.test(o.name)) {
      waves.push({ mesh: o, p0: o.position.clone(), phase: waves.length * 1.7 });
      // the shore foam is a scalloped cut-out band (alpha test, opaque), the wave lines fade in three steps
      if (o.name === 'Out_foam') {
        m.transparent = false;
        m.opacity = 1;
        m.alphaTest = 0.5;
        m.blending = NormalBlending;
        m.depthWrite = true;
      } else m.transparent = true;
    }
  });
  for (const [parent, b] of layerB) parent.add(b);

  // sky: 8 sides, 6 rings, colours per vertex (written by the light rig); Gouraud plus the dither makes the banded sky
  const dg = new SphereGeometry(150, 8, 6);
  dg.setAttribute('color', new BufferAttribute(new Float32Array(must(dg.attributes.position).count * 3), 3));
  const dome = new Mesh(
    dg,
    portal(ps1(new MeshBasicMaterial({ side: BackSide, depthWrite: false, vertexColors: true }))),
  );
  dome.renderOrder = 2;
  group.add(dome);

  const glass = must(root.getObjectByName('Window_Glass') as Mesh | undefined, 'Window_Glass');
  const maskMat = ps1(new MeshBasicMaterial({ colorWrite: false, depthWrite: false, side: DoubleSide }));
  maskMat.stencilWrite = true;
  maskMat.stencilRef = 1;
  maskMat.stencilFunc = AlwaysStencilFunc;
  maskMat.stencilZPass = ReplaceStencilOp;
  const mask = new Mesh(glass.geometry, maskMat);
  mask.position.copy(glass.position);
  mask.quaternion.copy(glass.quaternion);
  mask.scale.copy(glass.scale);
  mask.renderOrder = 1;
  mask.userData.mask = true;
  must(glass.parent).add(mask);

  const q3 = (o: number): number => Math.ceil(o * 3) / 3; // opacity in three steps, like a semi-transparency mode
  function animate(t: number): void {
    psx.time.value = t; // the sea's vertex bob
    // a third of a texel per step: one internal pixel at 96 px/m, never a sub-pixel slide
    for (const l of layers) l.map.offset.set(Math.floor(t * l.vx * 3) / 3 / 64, Math.floor(t * l.vy * 3) / 3 / 64);
    // foam lines roll in and fade, the shoreline foam band slides up and back
    for (const w of waves) {
      const pos = w.mesh.position.copy(w.p0);
      if (w.mesh.name === 'Out_foam') {
        pos.z += Math.round(0.1 * Math.sin(t * 0.9) * 96) / 96;
        continue;
      }
      const k = (t * 0.18 + w.phase * 0.13) % 1;
      pos.z += (1 - k) * 0.35 - 0.1; // towards the shore (+z is the room side)
      materialOf(w.mesh).opacity = q3(Math.sin(Math.PI * k) * 0.9);
    }
  }

  return { group, mats, sun, sunMat: must(sunMat as MeshBasicMaterial | null, 'Sun'), dome, mask, animate };
}

const DUSK_TINT = new Color(0xffa05a);
const NIGHT_BLUE = linear(0x3a4fa8);
const RAIN_GREY = linear(0x56657a);
const RAIN_TINT = linear(0x8c96aa);
const CLOUD_DAY = linear(0x5a6378);
const CLOUD_NIGHT = linear(0x222a40);
const SUN_DAY = linear(0xfff3a0);
const SUN_NIGHT = linear(0xdfe6ff);
const SUN_DUSK = linear(0xff8a3c);
const tint = new Color();
const cTop = new Color();
const cLow = new Color();
const cc = new Color();

/**
 * The coast for the hour: the sky dome's rings from the window sky (sRGB top and low colours), and one tint over the
 * unlit coast's own colours (night blue .. daylight white, warm at dusk, greyer and darker in the rain).
 */
export function lightCoast(o: Outdoor, sky: SkyFactors, overcast: number, top: Color, low: Color): void {
  const geo = o.dome.geometry;
  const dc = geo.attributes.color as BufferAttribute;
  const dp = geo.attributes.position as BufferAttribute;
  cTop.copy(top).convertSRGBToLinear();
  cLow.copy(low).convertSRGBToLinear();
  for (let i = 0; i < dp.count; i++) {
    const hy = Math.max(0, dp.getY(i) / 150);
    cc.copy(cLow).lerp(cTop, Math.min(1, hy * 1.4));
    dc.setXYZ(i, cc.r, cc.g, cc.b);
  }
  dc.needsUpdate = true;
  // Crash nights are blue and readable. A blue tint alone turns yellow sand and brown bark grey (they reflect no
  // blue): at night every outdoor colour is also pulled a third of the way to the night blue, so sand reads
  // lavender-blue, never grey.
  tint
    .setHex(0x6a84e8)
    .lerp(cc.setHex(0xffffff), sky.day)
    .lerp(DUSK_TINT, 0.6 * sky.dusk)
    .convertSRGBToLinear();
  tint.lerp(RAIN_TINT, 0.6 * overcast).multiplyScalar(1 - 0.38 * overcast); // rain: a greyer, darker coast
  const nightK = 0.35 * (1 - sky.day);
  const greyK = 0.45 * overcast * (0.4 + 0.6 * sky.day); // the turquoise goes slate in the rain
  for (const m of o.mats) {
    const d = mdata(m);
    m.color
      .copy(d.base0 ?? m.color)
      .multiply(tint)
      .lerp(NIGHT_BLUE, nightK)
      .lerp(RAIN_GREY, greyK);
    if (d.cloud) m.color.lerp(sky.day > 0.5 ? CLOUD_DAY : CLOUD_NIGHT, 0.75 * overcast); // heavy clouds
    (d.wxc ??= new Color()).copy(m.color);
  }
  if (o.sun) o.sun.visible = overcast < 0.6;
  // the sun outside keeps the real hour
  o.sunMat.color.copy(sky.day > 0.5 ? SUN_DAY : SUN_NIGHT).lerp(SUN_DUSK, sky.dusk * 0.7);
}
