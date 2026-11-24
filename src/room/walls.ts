/* Dollhouse walls: a wall the camera is behind turns see-through instead of vanishing (each wall gets its own material
   copies to fade), and the additive light cards painted on the west wall fade with it. */
import { AdditiveBlending, Box3, FrontSide, Mesh, MeshBasicMaterial, PlaneGeometry, Vector3 } from 'three';
import type { Camera, Object3D } from 'three';
import { linear } from './lighting';
import type { MaterialIndex } from './materials';
import { isMesh, materialOf } from './materials';
import { cloneM, mdata, ps1 } from './psx';
import type { RoomMaterial } from './psx';
import { poolTexture } from './textures';

interface Fade {
  mats: RoomMaterial[];
  /** eased 0 (see-through) .. 1 (solid), and the linear fade it eases */
  k: number;
  t: number;
}

interface Card {
  m: MeshBasicMaterial;
  mesh: Mesh;
  base: number;
  on: number;
}

/** How long a wall takes to fade, in seconds. */
const FADE_S = 0.55;

export class Walls {
  /** 0: the north wall (the window), 1: the west wall */
  private readonly fades: [Fade, Fade];
  private readonly cards: Card[] = [];
  private readonly rel = new Vector3();

  constructor(
    north: Object3D,
    private readonly west: Object3D,
    index: MaterialIndex,
  ) {
    const fade = (g: Object3D): Fade => {
      const mats: RoomMaterial[] = [];
      g.traverse((o) => {
        if (!isMesh(o) || o.userData.mask) return;
        const m = cloneM(materialOf(o));
        const panel = o.name.startsWith('Wall_');
        index.add(m);
        const d = mdata(m);
        d.base = m.transparent ? m.opacity : 1;
        d.panel = panel;
        o.material = m;
        mats.push(m);
        if (d.base === 1) m.side = FrontSide; // see-through walls show only their near faces, never their insides
        // fixed draw order while see-through: wall panels first, then what hangs on them, then glass. Without it the
        // renderer re-sorts them by distance every frame and each object seems to fade at its own pace.
        o.renderOrder = d.base < 1 ? 12 : panel ? 10 : 11;
      });
      return { mats, k: 1, t: 1 };
    };
    this.fades = [fade(north), fade(west)];
  }

  /** How solid a wall is, 0..1. */
  k(wall: 0 | 1): number {
    return this.fades[wall].k;
  }

  /** Light cards on the west wall: 32 px, four hard radial steps, additive; a PS1 light pool, not bloom. */
  addCards(root: Object3D): void {
    const tex = poolTexture();
    const wallW = root.getObjectByName('Wall_W');
    const x = wallW ? new Box3().setFromObject(wallW).max.x : -3.5;
    const shade = root.getObjectByName('Bedside_lamp_shade');
    if (!shade) return;
    const p = new Box3().setFromObject(shade).getCenter(new Vector3());
    const m = ps1(
      new MeshBasicMaterial({
        map: tex,
        color: linear(0xffb964),
        transparent: true,
        opacity: 0,
        blending: AdditiveBlending,
        depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: -4,
        polygonOffsetUnits: -4,
      }),
    );
    const mesh = new Mesh(new PlaneGeometry(0.9, 0.9), m);
    mesh.rotation.y = Math.PI / 2;
    mesh.position.set(x + 0.006, p.y, p.z);
    mesh.renderOrder = 11;
    this.west.add(mesh);
    this.west.worldToLocal(mesh.position);
    this.cards.push({ m, mesh, base: 0.18, on: 1 });
  }

  /** The cards are lit with the room's lamps. */
  setCards(on: boolean): void {
    for (const c of this.cards) c.on = on ? 1 : 0;
    this.fadeCards();
  }

  private fadeCards(): void {
    const k = this.fades[1].k;
    for (const c of this.cards) {
      c.m.opacity = c.base * c.on * k;
      c.mesh.visible = c.m.opacity > 0.002;
    }
  }

  /** A wall and everything on it fades while the camera is behind it. */
  tick(dt: number, camera: Camera, target: Vector3): void {
    const rel = this.rel.copy(camera.position).sub(target).normalize();
    for (let i = 0; i < 2; i++) {
      const f = this.fades[i];
      if (!f) continue;
      const side = i === 0 ? rel.z : rel.x;
      const goal = side > -0.12 ? 1 : 0;
      if (f.t === goal) continue;
      f.t = Math.max(0, Math.min(1, f.t + ((goal > f.t ? 1 : -1) * dt) / FADE_S)); // a steady fade, eased below
      f.k = f.t * f.t * (3 - 2 * f.t);
      const solid = f.t >= 1; // back to opaque only once the fade has fully finished, so nothing snaps
      for (const m of f.mats) {
        const b = mdata(m).base ?? 1;
        m.opacity = b * (0.16 + 0.84 * f.k);
        m.transparent = !solid || b < 1;
        m.depthWrite = b < 1 ? false : mdata(m).panel ? solid : true; // only the big panels stop hiding what is behind
      }
      if (i === 1) this.fadeCards();
    }
  }

  /** The camera direction from the target (the coast is drawn only while it looks in through the window). */
  get lookingIn(): boolean {
    return this.rel.z > 0;
  }
}
