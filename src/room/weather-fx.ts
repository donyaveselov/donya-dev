/* The weather where it is seen: the camera looks down through the window, so there are slanted 1 px rain lines between
   the glass and the sea, 2 px splashes on the sand and water, drops running down the glass (two scrolling 32 px tiles,
   nearest), a grey sky and a darker coast (the light rig). A storm adds lightning: two hard flashes that light the
   coast and, through the window, the room. No flashes with reduced motion. */
import {
  Box3,
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  Color,
  LineBasicMaterial,
  LineSegments,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  Points,
  PointsMaterial,
  Raycaster,
  RepeatWrapping,
  Vector3,
} from 'three';
import type { Object3D, PointLight, Scene } from 'three';
import { linear } from './lighting';
import { isMesh } from './materials';
import type { Outdoor } from './outdoor';
import { portal } from './outdoor';
import { mdata, nearest } from './psx';
import { REDUCED_MOTION } from './state';
import { canvas, ctx2d } from './textures';
import { must } from './util';
import { effectiveKind, flashLevel, rainAmount } from './weather';
import type { Weather } from './weather';

// the volume behind the glass that the camera actually sees through it
const X0 = -6;
const XW = 10;
const Z0 = -2.95;
const ZW = 6;
const DROPS = 380;
const SPLASHES = 46;
const BOLT_STEPS = 14;

interface Drop {
  x: number;
  y: number;
  z: number;
  v: number;
}

function respawn(r: Drop, top: boolean): Drop {
  r.x = X0 + Math.random() * XW;
  r.z = Z0 - Math.random() * ZW;
  r.y = top ? 3.4 + Math.random() * 0.8 : -0.3 + Math.random() * 4.2;
  r.v = 8 + Math.random() * 3;
  return r;
}

const FLASH = linear(0xdde6ff);

export class WeatherFx {
  /** the window light without a flash, set by the light rig */
  winBase = 0;
  readonly winCol = new Color();
  private readonly drops: Drop[] = [];
  private readonly rainPos = new Float32Array(DROPS * 6);
  private readonly rainGeo: BufferGeometry;
  private readonly rain: LineSegments;
  private readonly spots: Vector3[] = [];
  private readonly splashPos = new Float32Array(SPLASHES * 3);
  private readonly splashGeo: BufferGeometry;
  private readonly splash: Points;
  private splashT = 0;
  private readonly boltPos = new Float32Array(BOLT_STEPS * 6);
  private readonly boltGeo: BufferGeometry;
  private readonly bolt: LineSegments;
  private readonly glass: { mesh: Mesh<PlaneGeometry, MeshBasicMaterial>; speed: number }[] = [];
  /** when the next strike comes (0 = not scheduled), when the last one was */
  private next = 0;
  private struck = -9;
  /** the flash level last applied; -1 forces a re-apply */
  private fk = 0;

  // Everything is made in the constructor body, in this order: three gives every geometry, material and texture a
  // uuid drawn from Math.random, and the rain's random sequence (seeded in the regression harness) follows from it.
  constructor(
    root: Object3D,
    scene: Scene,
    private readonly outdoor: Outdoor,
    private readonly wx: Weather,
    private readonly winFill: () => PointLight | null,
    private readonly northWallSolid: () => boolean,
  ) {
    root.updateMatrixWorld(true);
    for (let i = 0; i < DROPS; i++) this.drops.push(respawn({ x: 0, y: 0, z: 0, v: 0 }, false));
    this.rainGeo = new BufferGeometry();
    this.rainGeo.setAttribute('position', new BufferAttribute(this.rainPos, 3));
    this.rain = new LineSegments(
      this.rainGeo,
      portal(new LineBasicMaterial({ color: linear(0xd2e2ff), transparent: true, opacity: 0.55, depthWrite: false })),
    );
    this.add(scene, this.rain);

    // splashes: 2 px points dropped on the real ground (ray cast once onto the sand, wet sand, shallows and sea)
    const ground: Object3D[] = [];
    outdoor.group.traverse((o) => {
      if (isMesh(o) && /^Out_(sand|wet|shallow|sea|grass)/.test(o.name)) ground.push(o);
    });
    const rc = new Raycaster();
    const down = new Vector3(0, -1, 0);
    const from = new Vector3();
    for (let i = 0; i < 120; i++) {
      const x = X0 + Math.random() * XW;
      rc.set(from.set(x, 6, Z0 - Math.random() * 5), down);
      const hit = rc.intersectObjects(ground, false)[0];
      if (hit) spotsPush(this.spots, hit.point);
    }
    this.splashGeo = new BufferGeometry();
    this.splashGeo.setAttribute('position', new BufferAttribute(this.splashPos, 3));
    this.splash = new Points(
      this.splashGeo,
      portal(
        new PointsMaterial({
          color: linear(0xe8f0ff),
          size: 2,
          sizeAttenuation: false,
          transparent: true,
          opacity: 0.8,
          depthWrite: false,
        }),
      ),
    );
    this.add(scene, this.splash);

    // lightning: a jagged polyline from the clouds down to the sea, rebuilt for every strike
    this.boltGeo = new BufferGeometry();
    this.boltGeo.setAttribute('position', new BufferAttribute(this.boltPos, 3));
    this.bolt = new LineSegments(
      this.boltGeo,
      portal(new LineBasicMaterial({ color: linear(0xf4f8ff), transparent: true, depthWrite: false })),
    );
    this.add(scene, this.bolt);

    // drops on the glass, room side: two tiles of short trails with a bright head, scrolling down at different speeds
    const gb = new Box3().setFromObject(must(root.getObjectByName('Window_Glass'), 'Window_Glass'));
    const gw = gb.max.x - gb.min.x;
    const gh = gb.max.y - gb.min.y;
    (
      [
        [11, 15],
        [7, 9],
      ] as const
    ).forEach(([count, speed], li) => {
      const c = canvas(32, 64);
      const g = ctx2d(c);
      for (let d = 0; d < count; d++) {
        const x = (d * 13 + li * 5 + 3) % 31;
        const y = (d * 23 + li * 11) % 56;
        const len = 3 + ((d * 5 + li) % 7);
        for (let q = 0; q < len; q++) {
          g.fillStyle = 'rgba(220,234,255,' + (0.12 + (0.45 * q) / len).toFixed(2) + ')';
          g.fillRect(x, y + q, 1, 1);
        }
        g.fillStyle = 'rgba(244,250,255,0.9)';
        g.fillRect(x, y + len, 1, 2); // a straight trail with a brighter tip, never a hook
      }
      const t = nearest(new CanvasTexture(c));
      t.wrapS = t.wrapT = RepeatWrapping;
      t.repeat.set(((li ? -1 : 1) * gw) / 0.333, gh / 0.667);
      const m = new Mesh(
        new PlaneGeometry(gw, gh),
        new MeshBasicMaterial({
          map: t,
          transparent: true,
          opacity: 0.7,
          depthWrite: false,
          polygonOffset: true,
          polygonOffsetFactor: -2,
          polygonOffsetUnits: -4,
        }),
      );
      m.position.set((gb.min.x + gb.max.x) / 2, (gb.min.y + gb.max.y) / 2, gb.max.z + 0.012 + li * 0.002);
      m.renderOrder = 13;
      m.visible = false;
      scene.add(m);
      this.glass.push({ mesh: m, speed });
    });
  }

  private add(scene: Scene, o: LineSegments | Points): void {
    o.frustumCulled = false;
    o.renderOrder = 5;
    o.visible = false;
    scene.add(o);
  }

  /** The next frame applies the flash level again (the light rig has just rewritten the colours it brightens). */
  invalidate(): void {
    this.fk = -1;
  }

  /** A strike on the next frame (the regression harness and the debug handle). */
  strike(): void {
    this.next = 0.001;
  }

  private newBolt(): void {
    let x = -10 + Math.random() * 12;
    let y = 9;
    let z = -16 - Math.random() * 8;
    for (let s = 0, k = 0; s < BOLT_STEPS; s++, k += 6) {
      const nx = x + (Math.random() - 0.5) * 1.4;
      const ny = y - (9.2 / BOLT_STEPS) * (0.7 + Math.random() * 0.6);
      const nz = z + (Math.random() - 0.5) * 0.6;
      const p = this.boltPos;
      p[k] = x;
      p[k + 1] = y;
      p[k + 2] = z;
      p[k + 3] = nx;
      p[k + 4] = ny;
      p[k + 5] = nz;
      x = nx;
      y = ny;
      z = nz;
    }
    must(this.boltGeo.attributes.position).needsUpdate = true;
  }

  private flash(fk: number): void {
    this.outdoor.dome.material.color.setScalar(1 + 1.6 * fk);
    for (const m of this.outdoor.mats) {
      const c = mdata(m).wxc;
      if (c) m.color.copy(c).multiplyScalar(1 + 1.3 * fk);
    }
    const win = this.winFill();
    if (win) {
      win.color.copy(this.winCol).lerp(FLASH, fk);
      win.intensity = this.winBase + 2.6 * fk;
    }
  }

  tick(t: number, dt: number): void {
    const d = rainAmount(this.wx);
    const outside = this.outdoor.group.visible;
    const vis = outside && d > 0;
    this.rain.visible = this.splash.visible = vis;
    if (vis) {
      const n = Math.round(DROPS * d);
      const p = this.rainPos;
      const fall = dt * (REDUCED_MOTION ? 0.25 : 1);
      for (let i = 0; i < n; i++) {
        const r = this.drops[i];
        if (!r) break;
        r.y -= r.v * fall;
        if (r.y < -0.3) respawn(r, true);
        // slanted by the wind off the sea
        const o = i * 6;
        p[o] = r.x;
        p[o + 1] = r.y;
        p[o + 2] = r.z;
        p[o + 3] = r.x + 0.07;
        p[o + 4] = r.y + 0.3;
        p[o + 5] = r.z - 0.02;
      }
      must(this.rainGeo.attributes.position).needsUpdate = true;
      this.rainGeo.setDrawRange(0, n * 2);
      if (t - this.splashT > 0.07 && this.spots.length) {
        // splashes blink at a steady low rate, like sprite frames
        this.splashT = t;
        const m = Math.round(SPLASHES * d);
        const sp = this.splashPos;
        for (let i = 0; i < SPLASHES; i++) {
          if (i < m && Math.random() < 0.7) {
            const s = must(this.spots[(Math.random() * this.spots.length) | 0]);
            sp[i * 3] = s.x;
            sp[i * 3 + 1] = s.y;
            sp[i * 3 + 2] = s.z;
          } else sp[i * 3 + 1] = -100;
        }
        must(this.splashGeo.attributes.position).needsUpdate = true;
      }
    }
    const onGlass = d > 0 && this.northWallSolid(); // gone while the north wall is see-through
    for (const g of this.glass) {
      g.mesh.visible = onGlass;
      g.mesh.material.opacity = 0.25 + 0.4 * d;
      must(g.mesh.material.map).offset.y = Math.floor(t * g.speed * (REDUCED_MOTION ? 0.2 : 1)) / 64;
    }
    // lightning: a strike every 5..14 s, two hard flashes and a short fade
    let fk = 0;
    let e = t - this.struck;
    if (effectiveKind(this.wx) === 'storm' && !REDUCED_MOTION) {
      if (!this.next) this.next = t + 2 + Math.random() * 4;
      if (t >= this.next) {
        this.struck = t;
        e = 0;
        this.next = t + 5 + Math.random() * 9;
        this.newBolt();
      }
      fk = flashLevel(e);
    } else this.next = 0;
    this.bolt.visible = outside && fk > 0.3 && e < 0.3;
    if (fk !== this.fk) {
      this.fk = fk;
      this.flash(fk);
    }
  }
}

function spotsPush(spots: Vector3[], p: Vector3): void {
  spots.push(p.clone().add(new Vector3(0, 0.03, 0)));
}
