// The two monitors: their glass (the live pictures), the glow ring around each, the panels that take the visitor's
// screen proportions, hovering and picking.
import { AdditiveBlending, DoubleSide, Group, Mesh, MeshBasicMaterial, Raycaster, Vector2, Vector3 } from 'three';
import type { BufferAttribute, Camera, CanvasTexture, Object3D, Texture } from 'three';
import { linear } from './lighting';
import { biasForward, mdata, ps1 } from './psx';
import { haloTexture } from './textures';
import { must } from './util';

export type Side = 'L' | 'R';
const SIDES: readonly Side[] = ['L', 'R'];

/** The glass of a monitor as seen from the camera: centre, normal towards the camera, size. */
export interface ScreenFrame {
  c: Vector3;
  n: Vector3;
  w: number;
  h: number;
}

export function screenFrame(mesh: Mesh, camera: Camera): ScreenFrame {
  const p = mesh.geometry.attributes.position as BufferAttribute;
  mesh.updateWorldMatrix(true, false);
  const pts: Vector3[] = [];
  for (let i = 0; i < p.count; i++) pts.push(new Vector3().fromBufferAttribute(p, i).applyMatrix4(mesh.matrixWorld));
  const c = pts.reduce((a, v) => a.add(v), new Vector3()).multiplyScalar(1 / pts.length);
  const [p0, p1, p2] = pts as [Vector3, Vector3, Vector3];
  const e1 = p1.clone().sub(p0);
  const e2 = p2.clone().sub(p0);
  const n = e1.clone().cross(e2).normalize();
  if (n.dot(camera.position.clone().sub(c)) < 0) n.negate();
  // the glass's own axes: across (horizontal in the world) and up along the glass
  const across = new Vector3(0, 1, 0).cross(n).normalize();
  const up = n.clone().cross(across).normalize();
  let w = 0;
  let h = 0;
  for (const v of pts) {
    const d = v.clone().sub(c);
    w = Math.max(w, Math.abs(d.dot(across)) * 2);
    h = Math.max(h, Math.abs(d.dot(up)) * 2);
  }
  return { c, n, w, h };
}

export interface Monitor {
  side: Side;
  /** Monitor_L / Monitor_R: hovered, picked and scaled as a whole */
  body: Object3D;
  screen: Mesh<Mesh['geometry'], MeshBasicMaterial>;
  halo: MeshBasicMaterial;
  /** the panel (frame, glass, glow) pivoting on the glass centre */
  panel: Group;
}

export class Monitors {
  readonly list: Monitor[] = [];
  /** hover: 0..1, eased */
  private hotK = 0;
  private panelAspect = 0;
  private readonly ray = new Raycaster();
  private readonly ndc = new Vector2();
  private readonly bodies: Object3D[] = [];

  /** The glass of each monitor gets a plain unlit material showing its picture. */
  constructor(root: Object3D, pictures: readonly [Texture, Texture]) {
    const made: Partial<Record<Side, { screen: Mesh<Mesh['geometry'], MeshBasicMaterial>; body: Object3D | null }>> =
      {};
    SIDES.forEach((s, i) => {
      const sc = root.getObjectByName('Screen_' + s) as Mesh | undefined;
      if (!sc) return;
      // the canvases keep their filtering: they are the hand-off surface
      const m = ps1(new MeshBasicMaterial({ map: pictures[i] ?? null }));
      // the glass sits millimetres off the bezel, which would win the depth test at a grazing angle (only depth moves)
      biasForward(m);
      sc.material = m;
      made[s] = {
        screen: sc as Mesh<Mesh['geometry'], MeshBasicMaterial>,
        body: root.getObjectByName('Monitor_' + s) ?? null,
      };
    });

    // glow: an additive card a little larger than each screen (a PS1 light card, not bloom): a ring around the glass in
    // four hard steps, empty over the glass itself so the picture on the screen is never tinted
    const haloTex = haloTexture();
    const halos: Partial<Record<Side, { mat: MeshBasicMaterial; mesh: Mesh }>> = {};
    for (const s of SIDES) {
      const sc = made[s]?.screen;
      if (!sc?.parent) continue;
      const hm = ps1(
        new MeshBasicMaterial({
          map: haloTex,
          transparent: true,
          blending: AdditiveBlending,
          depthWrite: false,
          polygonOffset: true,
          polygonOffsetFactor: -4,
          polygonOffsetUnits: -4,
          side: DoubleSide,
        }),
      );
      const halo = new Mesh(sc.geometry, hm);
      halo.position.copy(sc.position);
      halo.quaternion.copy(sc.quaternion);
      sc.geometry.computeBoundingBox();
      const bc = must(sc.geometry.boundingBox).getCenter(new Vector3());
      halo.scale.copy(sc.scale).multiplyScalar(1.25);
      halo.position.sub(bc.clone().multiplyScalar(0.25).applyQuaternion(sc.quaternion)); // grow about the screen centre
      halo.renderOrder = 5;
      sc.parent.add(halo);
      halos[s] = { mat: hm, mesh: halo };
    }

    // Each monitor's panel (frame, glass, glow) sits in its own group pivoting on the glass centre, so the panel can
    // take the visitor's screen proportions (fit): a 16:10 laptop gets a 16:10 monitor, and the flight into it ends on
    // the whole picture instead of a crop.
    for (const s of SIDES) {
      const mon = made[s]?.body;
      const sc = made[s]?.screen;
      const halo = halos[s];
      if (!mon || !sc || !halo) continue;
      mon.updateMatrixWorld(true);
      const pivot = new Group();
      pivot.name = 'Panel_' + s;
      pivot.position.copy(sc.position);
      mon.add(pivot);
      pivot.updateMatrixWorld(true);
      const frame = root.getObjectByName('Monitor_' + s + '_body');
      if (frame) pivot.attach(frame);
      pivot.attach(sc);
      pivot.attach(halo.mesh);
      this.list.push({ side: s, body: mon, screen: sc, halo: halo.mat, panel: pivot });
      this.bodies.push(mon);
    }
  }

  get(side: Side): Monitor | undefined {
    return this.list.find((m) => m.side === side);
  }

  /** Index of a glass material (0 left, 1 right), -1 when it is not one. */
  indexOf(m: MeshBasicMaterial): number {
    return this.list.findIndex((x) => x.screen.material === m);
  }

  /** The glow ring takes the screen light's colour. */
  tint(hex: number, opacity: number): void {
    const c = linear(hex);
    for (const m of this.list) {
      m.halo.color.copy(c);
      m.halo.opacity = opacity;
    }
  }

  /** Shows a picture on each glass that is not in the middle of the hand-off. */
  show(pick: (i: number) => CanvasTexture): void {
    this.list.forEach((m, i) => {
      const glass = m.screen.material;
      if (!mdata(glass).hand) glass.map = pick(i);
      glass.color.setScalar(1);
    });
  }

  /** Landscape screens get a panel of their own proportions (portrait phones keep the stock 16:9 one). */
  fit(width: number, height: number, camera: Camera): void {
    const first = this.list[0];
    if (!first) return;
    for (const m of this.list) {
      m.panel.scale.set(1, 1, 1);
      m.panel.updateMatrixWorld(true);
    }
    if (!this.panelAspect) {
      const f0 = screenFrame(first.screen, camera);
      this.panelAspect = f0.w / f0.h;
    }
    if (width <= height) return;
    const sy = this.panelAspect / Math.max(1.33, Math.min(2.4, width / height));
    for (const m of this.list) {
      m.panel.scale.set(1, sy, 1);
      m.panel.updateMatrixWorld(true);
    }
  }

  /** Resets the hover bounce, so the glass is measured at its real size. */
  settle(): void {
    this.hotK = 0;
    for (const m of this.list) {
      m.body.scale.setScalar(1);
      m.body.updateMatrixWorld(true);
    }
  }

  /** Eases the hover bounce towards `hot`. */
  hover(hot: boolean, dt: number): void {
    this.hotK += ((hot ? 1 : 0) - this.hotK) * Math.min(1, dt * 10);
    for (const m of this.list) m.body.scale.setScalar(1 + this.hotK * 0.05);
  }

  /** Points the ray at a page position over the canvas. */
  aim(ev: { clientX: number; clientY: number }, el: HTMLElement, camera: Camera): Raycaster {
    const r = el.getBoundingClientRect();
    this.ndc.set(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1);
    this.ray.setFromCamera(this.ndc, camera);
    return this.ray;
  }

  /** The nearest monitor hit by the ray: its side and distance. */
  hit(ray: Raycaster): { side: Side; distance: number } | null {
    const hit = ray.intersectObjects(this.bodies, true)[0];
    // the ray hits a part (the stand, the bezel): the monitor is the body it belongs to
    for (let o = hit?.object ?? null; hit && o; o = o.parent) {
      const side = SIDES.find((s) => o.name === 'Monitor_' + s);
      if (side) return { side, distance: hit.distance };
    }
    return null;
  }
}
